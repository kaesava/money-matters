import {
  DbOrTx,
  envelopes,
  bankAccounts,
  incomeSources,
  expenseEvents,
  incomeEvents,
  transactionLedger,
  tenants,
  getEnvelopeBalancesMap,
} from "@money-matters/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { SaveSetupBudgetCommand } from "@money-matters/types";
import { randomUUID } from "crypto";
import {
  EnvelopeScheduleCandidate,
  buildEnvelopeEventPayloads,
  insertEnvelopeEventsBulk,
  IncomeScheduleCandidate,
  buildIncomeEventPayloads,
  insertIncomeEventsBulk,
  deriveRrule,
  computeBillScheduleAnchorDate,
} from "./save-setup-budget-helpers.js";

export interface SaveSetupBudgetResult {
  success: boolean;
  persistedCounts: {
    incomes: number;
    bankAccounts: number;
    envelopes: number;
    sweptEnvelopes: number;
    sweptTotalAmount: number;
    expenseSources: number;
  };
}

export function saveSetupBudgetHandler(dbClient: DbOrTx) {
  return async (
    rawInput: z.input<typeof SaveSetupBudgetCommand>,
    appId: string,
    userId: string,
    tenantId: string
  ): Promise<SaveSetupBudgetResult> => {
    const input = SaveSetupBudgetCommand.parse(rawInput);
    const runInTx =
      typeof dbClient.transaction === "function"
        ? (cb: (tx: DbOrTx) => Promise<SaveSetupBudgetResult>) => dbClient.transaction(cb)
        : (cb: (tx: DbOrTx) => Promise<SaveSetupBudgetResult>) => cb(dbClient);

    return await runInTx(async (tx) => {
      const now = new Date();

      // =========================================================================
      // 1. Process Bank Accounts
      // =========================================================================
      const existingAccounts = await tx
        .select()
        .from(bankAccounts)
        .where(
          and(
            eq(bankAccounts.tenantId, tenantId),
            eq(bankAccounts.appId, appId),
            sql`${bankAccounts.archivedAt} IS NULL`
          )
        );

      const accountIdMap = new Map<string, string>(); // input.id or idx -> real DB UUID

      for (let i = 0; i < input.bankAccounts.length; i++) {
        const accInput = input.bankAccounts[i];
        const matchedExisting = accInput.id
          ? existingAccounts.find((a) => a.id === accInput.id)
          : null;

        if (matchedExisting) {
          await tx
            .update(bankAccounts)
            .set({
              name: accInput.name,
              bankProvider: accInput.bankProvider || matchedExisting.bankProvider,
              accountType: accInput.accountType || matchedExisting.accountType,
              lastKnownBalance: accInput.lastKnownBalance || matchedExisting.lastKnownBalance,
              unbudgetedBuffer: accInput.unbudgetedBuffer || matchedExisting.unbudgetedBuffer,
              isPrivate: accInput.isPrivate ?? matchedExisting.isPrivate,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(eq(bankAccounts.id, matchedExisting.id));

          if (accInput.id) accountIdMap.set(accInput.id, matchedExisting.id);
          accountIdMap.set(`idx-${i}`, matchedExisting.id);
        } else {
          const newAccountId = randomUUID();
          await tx.insert(bankAccounts).values({
            id: newAccountId,
            tenantId,
            appId,
            name: accInput.name,
            bankProvider: accInput.bankProvider || "Other",
            accountType: accInput.accountType || "EVERYDAY",
            lastKnownBalance: accInput.lastKnownBalance || "0.00",
            unbudgetedBuffer: accInput.unbudgetedBuffer || "0.00",
            isPrivate: accInput.isPrivate ?? false,
            createdAt: now,
            createdBy: userId,
            updatedAt: now,
            updatedBy: userId,
          });

          if (accInput.id) accountIdMap.set(accInput.id, newAccountId);
          accountIdMap.set(`idx-${i}`, newAccountId);
        }
      }

      if (input.archivedAccountIds && input.archivedAccountIds.length > 0) {
        await tx
          .update(bankAccounts)
          .set({
            archivedAt: now,
            archivedBy: userId,
            updatedAt: now,
            updatedBy: userId,
          })
          .where(
            and(
              eq(bankAccounts.tenantId, tenantId),
              eq(bankAccounts.appId, appId),
              inArray(bankAccounts.id, input.archivedAccountIds)
            )
          );
      }

      const primaryBankAccountId =
        accountIdMap.get(input.bankAccounts[0]?.id || "") ||
        accountIdMap.get("idx-0") ||
        existingAccounts[0]?.id ||
        "";

      // =========================================================================
      // 2. Fetch Active Envelopes & Handle Archivals / Sweeps
      // =========================================================================
      const existingEnvelopes = await tx
        .select()
        .from(envelopes)
        .where(
          and(
            eq(envelopes.tenantId, tenantId),
            eq(envelopes.appId, appId),
            sql`${envelopes.archivedAt} IS NULL`
          )
        );

      // Validate Everyday envelope cannot be archived if shared
      for (const envId of input.archivedEnvelopeIds) {
        const targetEnv = existingEnvelopes.find((e) => e.id === envId);
        if (targetEnv && targetEnv.envelopeType === "EVERYDAY" && !targetEnv.isPrivate) {
          throw new Error("The default Everyday envelope cannot be deleted or archived.");
        }
      }

      const envelopeBalancesMap = await getEnvelopeBalancesMap(tenantId, appId, tx);
      let sweptEnvelopesCount = 0;
      let sweptTotalAmount = 0;

      for (const envId of input.archivedEnvelopeIds) {
        const envToArchive = existingEnvelopes.find((e) => e.id === envId);
        if (!envToArchive) continue;

        const currentBalance = envelopeBalancesMap[envId] || 0;
        if (currentBalance > 0.005) {
          const destEnvId =
            input.envelopes.find((e) => e.isSurplusTarget)?.id ||
            existingEnvelopes.find((e) => e.isSurplusTarget && e.id !== envId)?.id;

          if (!destEnvId) {
            throw new Error(
              `Cannot remove envelope "${envToArchive.name}" with positive balance of $${currentBalance.toFixed(
                2
              )} without specifying a valid destination envelope for the funds sweep.`
            );
          }

          const transferNote = `Balance sweep upon archiving envelope "${envToArchive.name}"`;
          const sweepAmountStr = currentBalance.toFixed(2);
          const transferGroupId = randomUUID();

          await tx.insert(transactionLedger).values([
            {
              id: randomUUID(),
              tenantId,
              appId,
              envelopeId: envId,
              bankAccountId: envToArchive.bankAccountId,
              amount: sweepAmountStr,
              flowType: "DEBIT",
              transactionType: "TRANSFER_OUT",
              idempotencyKey: `sweep-out-${envId}-${randomUUID()}`,
              note: transferNote,
              source: "MANUAL",
              transferGroupId,
              recordedAt: now,
              createdAt: now,
              createdBy: userId,
              updatedAt: now,
              updatedBy: userId,
            },
            {
              id: randomUUID(),
              tenantId,
              appId,
              envelopeId: destEnvId,
              bankAccountId: envToArchive.bankAccountId,
              amount: sweepAmountStr,
              flowType: "CREDIT",
              transactionType: "TRANSFER_IN",
              idempotencyKey: `sweep-in-${destEnvId}-${randomUUID()}`,
              note: transferNote,
              source: "MANUAL",
              transferGroupId,
              recordedAt: now,
              createdAt: now,
              createdBy: userId,
              updatedAt: now,
              updatedBy: userId,
            },
          ]);

          sweptEnvelopesCount++;
          sweptTotalAmount += currentBalance;
        }

        await tx
          .update(envelopes)
          .set({
            archivedAt: now,
            archivedBy: userId,
            updatedAt: now,
            updatedBy: userId,
          })
          .where(eq(envelopes.id, envId));
      }

      // =========================================================================
      // 3. Upsert Active Envelopes
      // =========================================================================
      const envelopeIdMap = new Map<string, string>(); // input.id -> real DB UUID

      for (let i = 0; i < input.envelopes.length; i++) {
        const envInput = input.envelopes[i];
        const matchedExisting = envInput.id
          ? existingEnvelopes.find((e) => e.id === envInput.id && !input.archivedEnvelopeIds.includes(e.id))
          : null;

        const resolvedBankAccountId =
          (envInput.bankAccountId && accountIdMap.get(envInput.bankAccountId)) ||
          envInput.bankAccountId ||
          primaryBankAccountId;

        const isScheduled = envInput.envelopeType === "SCHEDULED_BILL";
        const rrule = isScheduled
          ? envInput.rrule || deriveRrule(envInput.budgetFrequency || "MONTHLY")
          : envInput.rrule || null;
        const startDate = isScheduled
          ? envInput.startDate || computeBillScheduleAnchorDate(envInput.budgetFrequency || "MONTHLY", now)
          : envInput.startDate || null;

        if (matchedExisting) {
          await tx
            .update(envelopes)
            .set({
              name: envInput.name,
              envelopeType: envInput.envelopeType,
              goalMode: envInput.goalMode ?? matchedExisting.goalMode,
              targetAmount: envInput.targetAmount,
              monthlyAmount: envInput.monthlyAmount || matchedExisting.monthlyAmount,
              enteredAmount: envInput.enteredAmount !== undefined ? envInput.enteredAmount : matchedExisting.enteredAmount,
              budgetFrequency: envInput.budgetFrequency || matchedExisting.budgetFrequency || "MONTHLY",
              startDate,
              endDate: envInput.endDate !== undefined ? envInput.endDate : matchedExisting.endDate,
              rrule,
              safetyBufferFloor: envInput.safetyBufferFloor || matchedExisting.safetyBufferFloor || "0.00",
              isSurplusTarget: envInput.isSurplusTarget ?? matchedExisting.isSurplusTarget,
              isCommitted: envInput.isCommitted ?? matchedExisting.isCommitted,
              isEssential: envInput.isEssential ?? matchedExisting.isEssential,
              isPrivate: envInput.isPrivate ?? matchedExisting.isPrivate,
              bankAccountId: resolvedBankAccountId || matchedExisting.bankAccountId,
              orderIndex: envInput.orderIndex ?? matchedExisting.orderIndex,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(eq(envelopes.id, matchedExisting.id));

          if (envInput.id) envelopeIdMap.set(envInput.id, matchedExisting.id);
          envelopeIdMap.set(`name-${envInput.name}`, matchedExisting.id);
        } else {
          const newEnvId = randomUUID();
          await tx.insert(envelopes).values({
            id: newEnvId,
            tenantId,
            appId,
            bankAccountId: resolvedBankAccountId,
            name: envInput.name,
            envelopeType: envInput.envelopeType,
            goalMode: envInput.goalMode ?? (envInput.envelopeType === "TARGET_GOAL" ? "TARGET_DATE" : "ONGOING"),
            targetAmount: envInput.targetAmount || null,
            monthlyAmount: envInput.monthlyAmount || null,
            enteredAmount: envInput.enteredAmount || null,
            budgetFrequency: envInput.budgetFrequency || "MONTHLY",
            startDate,
            endDate: envInput.endDate || null,
            rrule,
            safetyBufferFloor: envInput.safetyBufferFloor || "0.00",
            isSurplusTarget: envInput.isSurplusTarget ?? false,
            isCommitted: envInput.isCommitted ?? false,
            isEssential: envInput.isEssential ?? false,
            isPrivate: envInput.isPrivate ?? false,
            orderIndex: envInput.orderIndex ?? i,
            createdAt: now,
            createdBy: userId,
            updatedAt: now,
            updatedBy: userId,
          });

          if (envInput.id) envelopeIdMap.set(envInput.id, newEnvId);
          envelopeIdMap.set(`name-${envInput.name}`, newEnvId);
        }
      }

      // =========================================================================
      // 4. Upsert Income Schedules
      // =========================================================================
      const existingIncomes = await tx
        .select()
        .from(incomeSources)
        .where(
          and(
            eq(incomeSources.tenantId, tenantId),
            eq(incomeSources.appId, appId),
            sql`${incomeSources.archivedAt} IS NULL`
          )
        );

      const todayAest = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(now);
      const incomeCandidates: IncomeScheduleCandidate[] = [];

      for (const incInput of input.incomes) {
        const matchedIncome = incInput.id ? existingIncomes.find((inc) => inc.id === incInput.id) : null;
        const resolvedRecvAccount =
          (incInput.receivingAccountId && accountIdMap.get(incInput.receivingAccountId)) ||
          incInput.receivingAccountId ||
          primaryBankAccountId;

        let rrule = "FREQ=MONTHLY";
        if (incInput.frequency === "WEEKLY") rrule = "FREQ=WEEKLY";
        else if (incInput.frequency === "FORTNIGHTLY") rrule = "FREQ=WEEKLY;INTERVAL=2";
        else if (incInput.frequency === "CUSTOM") rrule = "FREQ=MONTHLY";

        const startDate = incInput.startDate || todayAest;

        if (matchedIncome) {
          await tx
            .update(incomeSources)
            .set({
              name: incInput.name,
              incomeType: incInput.incomeType || matchedIncome.incomeType,
              amount: incInput.amount,
              receivingAccountId: resolvedRecvAccount || matchedIncome.receivingAccountId,
              rrule,
              startDate,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(eq(incomeSources.id, matchedIncome.id));

          incomeCandidates.push({
            incomeSourceId: matchedIncome.id,
            name: incInput.name,
            amount: incInput.amount,
            rrule,
            startDate,
          });
        } else {
          const newIncomeId = randomUUID();
          await tx.insert(incomeSources).values({
            id: newIncomeId,
            tenantId,
            appId,
            name: incInput.name,
            incomeType: incInput.incomeType || "SALARIED",
            amount: incInput.amount,
            receivingAccountId: resolvedRecvAccount || null,
            rrule,
            startDate,
            createdAt: now,
            createdBy: userId,
            updatedAt: now,
            updatedBy: userId,
          });

          incomeCandidates.push({
            incomeSourceId: newIncomeId,
            name: incInput.name,
            amount: incInput.amount,
            rrule,
            startDate,
          });
        }
      }

      if (input.archivedIncomeIds && input.archivedIncomeIds.length > 0) {
        await tx
          .update(incomeSources)
          .set({
            archivedAt: now,
            archivedBy: userId,
            updatedAt: now,
            updatedBy: userId,
          })
          .where(
            and(
              eq(incomeSources.tenantId, tenantId),
              eq(incomeSources.appId, appId),
              inArray(incomeSources.id, input.archivedIncomeIds)
            )
          );
      }

      // Auto-burst 12 months of income_events
      if (input.autoCreateIncomeEvents !== false && incomeCandidates.length > 0) {
        const candidateSourceIds = incomeCandidates.map((c) => c.incomeSourceId);
        const existingIncomeEvents = await tx
          .select({
            incomeSourceId: incomeEvents.incomeSourceId,
            expectedDate: incomeEvents.expectedDate,
          })
          .from(incomeEvents)
          .where(
            and(
              eq(incomeEvents.tenantId, tenantId),
              eq(incomeEvents.appId, appId),
              inArray(incomeEvents.incomeSourceId, candidateSourceIds),
              sql`${incomeEvents.archivedAt} IS NULL`
            )
          );

        const existingDatesBySource = new Map<string, Set<string>>();
        for (const ev of existingIncomeEvents) {
          if (!ev.incomeSourceId) continue;
          if (!existingDatesBySource.has(ev.incomeSourceId)) {
            existingDatesBySource.set(ev.incomeSourceId, new Set<string>());
          }
          existingDatesBySource.get(ev.incomeSourceId)!.add(ev.expectedDate);
        }

        const { eventsToInsert } = buildIncomeEventPayloads(
          incomeCandidates,
          existingDatesBySource,
          tenantId,
          appId,
          userId,
          now
        );
        await insertIncomeEventsBulk(tx, eventsToInsert);
      }

      // =========================================================================
      // 5. Auto-create Scheduled Events for SCHEDULED_BILL Envelopes
      // =========================================================================
      let createdEventsCount = 0;
      if (input.autoCreateExpenseSchedules !== false) {
        const existingScheduledEvents = await tx
          .select({
            id: expenseEvents.id,
            envelopeId: expenseEvents.envelopeId,
          })
          .from(expenseEvents)
          .where(
            and(
              eq(expenseEvents.tenantId, tenantId),
              eq(expenseEvents.appId, appId),
              eq(expenseEvents.isScheduled, true),
              sql`${expenseEvents.archivedAt} IS NULL`
            )
          );

        const candidates: EnvelopeScheduleCandidate[] = [];

        for (const envInput of input.envelopes) {
          if (envInput.envelopeType !== "SCHEDULED_BILL") continue;

          const amountVal = envInput.enteredAmount || envInput.monthlyAmount || "0.00";
          if (parseFloat(amountVal) <= 0) continue;

          const envId = (envInput.id && envelopeIdMap.get(envInput.id)) || envelopeIdMap.get(`name-${envInput.name}`);
          if (!envId) continue;

          const hasExisting = existingScheduledEvents.some((e) => e.envelopeId === envId);
          if (hasExisting) continue;

          candidates.push({
            name: envInput.name,
            amount: amountVal,
            budgetFrequency: envInput.budgetFrequency || "MONTHLY",
            envelopeId: envId,
            startDate: envInput.startDate,
            endDate: envInput.endDate,
            rrule: envInput.rrule,
          });
        }

        if (candidates.length > 0) {
          const { eventsToInsert } = buildEnvelopeEventPayloads(
            candidates,
            tenantId,
            appId,
            userId,
            now
          );
          createdEventsCount = await insertEnvelopeEventsBulk(tx, eventsToInsert);
        }
      }

      // =========================================================================
      // 6. Update Tenant Setup Status
      // =========================================================================
      if (typeof (tx as any).update === "function") {
        await tx
          .update(tenants)
          .set({
            setupCompletedAt: now,
            setupStatus: "COMPLETED",
            updatedAt: now,
            updatedBy: userId,
          })
          .where(eq(tenants.id, tenantId));
      }

      return {
        success: true,
        persistedCounts: {
          incomes: input.incomes.length,
          bankAccounts: input.bankAccounts.length,
          envelopes: input.envelopes.length,
          sweptEnvelopes: sweptEnvelopesCount,
          sweptTotalAmount,
          expenseSources: createdEventsCount,
        },
      };
    });
  };
}
