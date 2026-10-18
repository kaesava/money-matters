import { DbOrTx, envelopes, transactionLedger, getEnvelopeBalancesMap } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { deriveRrule, computeBillScheduleAnchorDate } from "./save-setup-budget-helpers.js";
import { archivePendingExpenseEvents, synchronizeUpdatedEnvelopeEvents } from "./save-setup-budget-sync.js";

export interface SaveSetupEnvelopeInput {
  id?: string;
  name: string;
  envelopeType: "EVERYDAY" | "SCHEDULED_BILL" | "FLEXIBLE_BILL" | "TARGET_GOAL" | "ONGOING_GOAL";
  goalMode?: "TARGET_DATE" | "ONGOING";
  bankAccountId?: string | null;
  targetAmount?: string | null;
  monthlyAmount?: string | null;
  enteredAmount?: string | null;
  budgetFrequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY";
  startDate?: string | null;
  endDate?: string | null;
  rrule?: string | null;
  safetyBufferFloor?: string | null;
  isSurplusTarget?: boolean;
  isCommitted?: boolean;
  isEssential?: boolean;
  isPrivate?: boolean;
  orderIndex?: number;
}

export async function processSetupEnvelopes(
  tx: DbOrTx,
  envelopesInput: SaveSetupEnvelopeInput[],
  archivedEnvelopeIds: string[],
  accountIdMap: Map<string, string>,
  primaryBankAccountId: string,
  tenantId: string,
  appId: string,
  userId: string,
  now: Date
): Promise<{ envelopeIdMap: Map<string, string>; sweptEnvelopesCount: number; sweptTotalAmount: number }> {
  const existingEnvelopes = await tx
    .select()
    .from(envelopes)
    .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), sql`${envelopes.archivedAt} IS NULL`));

  for (const envId of archivedEnvelopeIds) {
    const targetEnv = existingEnvelopes.find((e) => e.id === envId);
    if (targetEnv && targetEnv.envelopeType === "EVERYDAY" && !targetEnv.isPrivate) {
      throw new Error("The default Everyday envelope cannot be deleted or archived.");
    }
  }

  const envelopeBalancesMap = await getEnvelopeBalancesMap(tenantId, appId, tx);
  let sweptEnvelopesCount = 0;
  let sweptTotalAmount = 0;

  for (const envId of archivedEnvelopeIds) {
    const envToArchive = existingEnvelopes.find((e) => e.id === envId);
    if (!envToArchive) continue;

    const currentBalance = envelopeBalancesMap[envId] || 0;
    if (currentBalance > 0.005) {
      const destEnvId =
        envelopesInput.find((e) => e.isSurplusTarget)?.id ||
        existingEnvelopes.find((e) => e.isSurplusTarget && e.id !== envId)?.id;

      if (!destEnvId) {
        throw new Error(
          `Cannot remove envelope "${envToArchive.name}" with positive balance of $${currentBalance.toFixed(2)} without specifying a valid destination envelope for the funds sweep.`
        );
      }

      const sweepAmountStr = currentBalance.toFixed(2);
      const transferGroupId = randomUUID();
      const transferNote = `Balance sweep upon archiving envelope "${envToArchive.name}"`;

      if (typeof tx.insert === "function") {
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
      }
      sweptEnvelopesCount++;
      sweptTotalAmount += currentBalance;
    }

    if (typeof tx.update === "function") {
      await tx
        .update(envelopes)
        .set({ archivedAt: now, archivedBy: userId, updatedAt: now, updatedBy: userId })
        .where(eq(envelopes.id, envId));
    }
  }

  await archivePendingExpenseEvents(tx, archivedEnvelopeIds, userId, now);

  const envelopeIdMap = new Map<string, string>();

  for (let i = 0; i < envelopesInput.length; i++) {
    const envInput = envelopesInput[i];
    const matchedExisting = envInput.id
      ? existingEnvelopes.find((e) => e.id === envInput.id && !archivedEnvelopeIds.includes(e.id))
      : null;

    const resolvedBankAccountId =
      (envInput.bankAccountId && accountIdMap.get(envInput.bankAccountId)) ||
      envInput.bankAccountId ||
      (matchedExisting ? matchedExisting.bankAccountId : primaryBankAccountId);

    const isScheduled = envInput.envelopeType === "SCHEDULED_BILL";
    const rrule = isScheduled
      ? envInput.rrule || deriveRrule(envInput.budgetFrequency || "MONTHLY")
      : envInput.rrule || null;
    const startDate = isScheduled
      ? envInput.startDate || computeBillScheduleAnchorDate(envInput.budgetFrequency || "MONTHLY", now)
      : envInput.startDate || null;

    if (matchedExisting) {
      const scheduleChanged =
        (envInput.envelopeType !== matchedExisting.envelopeType) ||
        (envInput.budgetFrequency !== undefined && envInput.budgetFrequency !== matchedExisting.budgetFrequency) ||
        (envInput.startDate !== undefined && envInput.startDate !== matchedExisting.startDate) ||
        (envInput.endDate !== undefined && envInput.endDate !== matchedExisting.endDate) ||
        (envInput.rrule !== undefined && envInput.rrule !== matchedExisting.rrule);

      const amountVal = envInput.enteredAmount || envInput.monthlyAmount || matchedExisting.enteredAmount || matchedExisting.monthlyAmount || "0.00";
      const nameOrAmountChanged =
        (envInput.name !== undefined && envInput.name !== matchedExisting.name) ||
        (envInput.enteredAmount !== undefined && envInput.enteredAmount !== matchedExisting.enteredAmount) ||
        (envInput.monthlyAmount !== undefined && envInput.monthlyAmount !== matchedExisting.monthlyAmount);

      if (typeof tx.update === "function") {
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
      }

      const effectiveFreq = (envInput.budgetFrequency || matchedExisting.budgetFrequency || "MONTHLY") as "MONTHLY" | "WEEKLY" | "FORTNIGHTLY" | "ANNUALLY";
      await synchronizeUpdatedEnvelopeEvents(tx, matchedExisting.id, scheduleChanged, nameOrAmountChanged, {
        name: envInput.name,
        amount: amountVal,
        rrule: rrule || deriveRrule(effectiveFreq),
        startDate: startDate || computeBillScheduleAnchorDate(effectiveFreq, now),
        tenantId,
        appId,
        userId,
        now,
      });

      if (envInput.id) envelopeIdMap.set(envInput.id, matchedExisting.id);
      envelopeIdMap.set(`name-${envInput.name}`, matchedExisting.id);
    } else {
      const newEnvId = randomUUID();
      if (typeof tx.insert === "function") {
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
      }

      if (envInput.id) envelopeIdMap.set(envInput.id, newEnvId);
      envelopeIdMap.set(`name-${envInput.name}`, newEnvId);
    }
  }

  return { envelopeIdMap, sweptEnvelopesCount, sweptTotalAmount };
}
