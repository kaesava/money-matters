import { DbOrTx, incomeSources, incomeEvents } from "@money-matters/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  IncomeScheduleCandidate,
  buildIncomeEventPayloads,
  insertIncomeEventsBulk,
} from "./save-setup-budget-calculators.js";
import { archivePendingIncomeEvents, synchronizeUpdatedIncomeEvents } from "./save-setup-budget-sync.js";

export interface SaveSetupIncomeInput {
  id?: string;
  name: string;
  type?: "SALARY" | "FREELANCE" | "INVESTMENT" | "OTHER";
  incomeType?: "SALARIED" | "IRREGULAR";
  amount: string;
  frequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "CUSTOM";
  receivingAccountId?: string | null;
  startDate?: string | null;
  rrule?: string | null;
}

export function deriveIncomeRrule(frequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "CUSTOM"): string {
  if (frequency === "WEEKLY") return "FREQ=WEEKLY";
  if (frequency === "FORTNIGHTLY") return "FREQ=WEEKLY;INTERVAL=2";
  return "FREQ=MONTHLY";
}

export async function processSetupIncomes(
  tx: DbOrTx,
  incomesInput: SaveSetupIncomeInput[],
  archivedIncomeIds: string[],
  accountIdMap: Map<string, string>,
  primaryBankAccountId: string,
  autoCreateIncomeEvents: boolean,
  tenantId: string,
  appId: string,
  userId: string,
  now: Date
): Promise<void> {
  const existingIncomes = await tx
    .select()
    .from(incomeSources)
    .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId), sql`${incomeSources.archivedAt} IS NULL`));

  const todayAest = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(now);
  const newIncomeCandidates: IncomeScheduleCandidate[] = [];

  for (const incInput of incomesInput) {
    const matchedIncome = incInput.id ? existingIncomes.find((inc) => inc.id === incInput.id) : null;
    const resolvedRecvAccount =
      (incInput.receivingAccountId && accountIdMap.get(incInput.receivingAccountId)) ||
      incInput.receivingAccountId ||
      (matchedIncome ? matchedIncome.receivingAccountId : primaryBankAccountId);

    const rrule = deriveIncomeRrule(incInput.frequency);
    const startDate = incInput.startDate || (matchedIncome ? matchedIncome.startDate : todayAest) || todayAest;

    if (matchedIncome) {
      const scheduleChanged =
        (incInput.frequency !== undefined && rrule !== matchedIncome.rrule) ||
        (incInput.startDate !== undefined && incInput.startDate !== matchedIncome.startDate);

      const nameOrAmountChanged =
        (incInput.name !== undefined && incInput.name !== matchedIncome.name) ||
        (incInput.amount !== undefined && incInput.amount !== matchedIncome.amount);

      if (typeof tx.update === "function") {
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
      }

      await synchronizeUpdatedIncomeEvents(tx, matchedIncome.id, scheduleChanged, nameOrAmountChanged, {
        name: incInput.name,
        amount: incInput.amount,
        rrule,
        startDate,
        tenantId,
        appId,
        userId,
        now,
      });
    } else {
      const newIncomeId = randomUUID();
      if (typeof tx.insert === "function") {
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
      }

      newIncomeCandidates.push({
        incomeSourceId: newIncomeId,
        name: incInput.name,
        amount: incInput.amount,
        rrule,
        startDate,
      });
    }
  }

  if (archivedIncomeIds.length > 0 && typeof tx.update === "function") {
    await tx
      .update(incomeSources)
      .set({ archivedAt: now, archivedBy: userId, updatedAt: now, updatedBy: userId })
      .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId), inArray(incomeSources.id, archivedIncomeIds)));
  }

  await archivePendingIncomeEvents(tx, archivedIncomeIds, userId, now);

  if (autoCreateIncomeEvents && newIncomeCandidates.length > 0) {
    const candidateSourceIds = newIncomeCandidates.map((c) => c.incomeSourceId);
    const existingIncomeEvents = await tx
      .select({ incomeSourceId: incomeEvents.incomeSourceId, expectedDate: incomeEvents.expectedDate })
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
      if (!existingDatesBySource.has(ev.incomeSourceId)) existingDatesBySource.set(ev.incomeSourceId, new Set<string>());
      existingDatesBySource.get(ev.incomeSourceId)!.add(ev.expectedDate);
    }

    const { eventsToInsert } = buildIncomeEventPayloads(newIncomeCandidates, existingDatesBySource, tenantId, appId, userId, now);
    await insertIncomeEventsBulk(tx, eventsToInsert);
  }
}
