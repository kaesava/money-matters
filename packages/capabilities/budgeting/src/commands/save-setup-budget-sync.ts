import { DbOrTx, expenseEvents, incomeEvents } from "@money-matters/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { generateBurstDates } from "../engine/burst-engine.js";

export async function archivePendingIncomeEvents(
  tx: DbOrTx,
  archivedIncomeIds: string[],
  userId: string,
  now: Date
): Promise<void> {
  if (archivedIncomeIds.length === 0) return;
  if (typeof tx.update !== "function") return;
  await tx
    .update(incomeEvents)
    .set({ archivedAt: now, updatedBy: userId, updatedAt: now })
    .where(
      and(
        inArray(incomeEvents.incomeSourceId, archivedIncomeIds),
        eq(incomeEvents.status, "PENDING"),
        sql`${incomeEvents.archivedAt} IS NULL`
      )
    );
}

export async function archivePendingExpenseEvents(
  tx: DbOrTx,
  archivedEnvelopeIds: string[],
  userId: string,
  now: Date
): Promise<void> {
  if (archivedEnvelopeIds.length === 0) return;
  if (typeof tx.update !== "function") return;
  await tx
    .update(expenseEvents)
    .set({ archivedAt: now, updatedBy: userId, updatedAt: now })
    .where(
      and(
        inArray(expenseEvents.envelopeId, archivedEnvelopeIds),
        eq(expenseEvents.status, "PENDING"),
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );
}

export async function synchronizeUpdatedIncomeEvents(
  tx: DbOrTx,
  sourceId: string,
  scheduleChanged: boolean,
  nameOrAmountChanged: boolean,
  params: { name: string; amount: string; rrule: string; startDate: string; tenantId: string; appId: string; userId: string; now: Date }
): Promise<void> {
  if (typeof tx.update !== "function") return;
  if (scheduleChanged) {
    await tx
      .update(incomeEvents)
      .set({ archivedAt: params.now, updatedBy: params.userId, updatedAt: params.now })
      .where(and(eq(incomeEvents.incomeSourceId, sourceId), eq(incomeEvents.status, "PENDING"), sql`${incomeEvents.archivedAt} IS NULL`));

    const dates = generateBurstDates(params.rrule, params.startDate, null, 12);
    if (dates.length > 0 && typeof tx.insert === "function") {
      await tx.insert(incomeEvents).values(
        dates.map((d) => {
          const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(d);
          return {
            tenantId: params.tenantId,
            appId: params.appId,
            incomeSourceId: sourceId,
            name: params.name,
            expectedDate: dateStr,
            actualDate: dateStr,
            expectedAmount: params.amount,
            actualAmount: params.amount,
            status: "PENDING" as const,
            createdAt: params.now,
            createdBy: params.userId,
            updatedAt: params.now,
            updatedBy: params.userId,
          };
        })
      );
    }
  } else if (nameOrAmountChanged) {
    await tx
      .update(incomeEvents)
      .set({ name: params.name, expectedAmount: params.amount, actualAmount: params.amount, updatedAt: params.now, updatedBy: params.userId })
      .where(and(eq(incomeEvents.incomeSourceId, sourceId), eq(incomeEvents.status, "PENDING"), sql`${incomeEvents.archivedAt} IS NULL`));
  }
}

export async function synchronizeUpdatedEnvelopeEvents(
  tx: DbOrTx,
  envelopeId: string,
  scheduleChanged: boolean,
  nameOrAmountChanged: boolean,
  params: {
    name: string;
    amount: string;
    rrule: string;
    startDate: string;
    isScheduledBill?: boolean;
    timeZone?: string;
    tenantId: string;
    appId: string;
    userId: string;
    now: Date;
  }
): Promise<void> {
  if (typeof tx.update !== "function") return;
  const tz = params.timeZone || "Australia/Sydney";
  const shouldBurst = params.isScheduledBill !== false;

  if (scheduleChanged) {
    await tx
      .update(expenseEvents)
      .set({ archivedAt: params.now, updatedBy: params.userId, updatedAt: params.now })
      .where(and(eq(expenseEvents.envelopeId, envelopeId), eq(expenseEvents.isScheduled, true), eq(expenseEvents.status, "PENDING"), sql`${expenseEvents.archivedAt} IS NULL`));

    if (shouldBurst && parseFloat(params.amount) > 0 && typeof tx.insert === "function") {
      const dates = generateBurstDates(params.rrule, params.startDate, null, 12);
      if (dates.length > 0) {
        await tx.insert(expenseEvents).values(
          dates.map((d) => ({
            tenantId: params.tenantId,
            appId: params.appId,
            envelopeId,
            name: params.name,
            expectedDate: new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d),
            expectedAmount: params.amount,
            isScheduled: true,
            status: "PENDING" as const,
            createdAt: params.now,
            createdBy: params.userId,
            updatedAt: params.now,
            updatedBy: params.userId,
          }))
        );
      }
    }
  } else if (nameOrAmountChanged) {
    await tx
      .update(expenseEvents)
      .set({ name: params.name, expectedAmount: params.amount, updatedAt: params.now, updatedBy: params.userId })
      .where(and(eq(expenseEvents.envelopeId, envelopeId), eq(expenseEvents.status, "PENDING"), sql`${expenseEvents.archivedAt} IS NULL`));
  }
}
