import { DbOrTx, expenseEvents, incomeEvents, envelopes, incomeSources } from "@money-matters/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { burstEnvelopeEvents } from "./envelope-schedule.js";
import { burstIncomeEvents } from "./income-schedule.js";

export async function archivePendingIncomeEvents(
  tx: DbOrTx,
  archivedIncomeIds: string[],
  userId: string,
  now: Date
): Promise<void> {
  if (archivedIncomeIds.length === 0) return;
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
  params: {
    name: string;
    amount: string;
    rrule: string;
    startDate: string;
    endDate?: string | null;
    timeZone?: string;
    tenantId: string;
    appId: string;
    userId: string;
    now: Date;
  }
): Promise<void> {
  if (scheduleChanged) {
    await tx
      .update(incomeEvents)
      .set({ archivedAt: params.now, updatedBy: params.userId, updatedAt: params.now })
      .where(and(eq(incomeEvents.incomeSourceId, sourceId), eq(incomeEvents.status, "PENDING"), sql`${incomeEvents.archivedAt} IS NULL`));

    const count = await burstIncomeEvents(tx, {
      incomeSourceId: sourceId,
      name: params.name,
      amount: params.amount,
      rrule: params.rrule,
      startDate: params.startDate,
      endDate: params.endDate,
      tenantId: params.tenantId,
      appId: params.appId,
      userId: params.userId,
      timeZone: params.timeZone,
    });

    if (count === 0) {
      await tx
        .update(incomeSources)
        .set({ lastBurstDate: params.endDate || null, updatedAt: params.now, updatedBy: params.userId })
        .where(eq(incomeSources.id, sourceId));
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
    endDate?: string | null;
    isScheduledBill?: boolean;
    timeZone?: string;
    tenantId: string;
    appId: string;
    userId: string;
    now: Date;
  }
): Promise<void> {
  const shouldBurst = params.isScheduledBill !== false;

  if (scheduleChanged) {
    await tx
      .update(expenseEvents)
      .set({ archivedAt: params.now, updatedBy: params.userId, updatedAt: params.now })
      .where(and(eq(expenseEvents.envelopeId, envelopeId), eq(expenseEvents.isScheduled, true), eq(expenseEvents.status, "PENDING"), sql`${expenseEvents.archivedAt} IS NULL`));

    if (shouldBurst && parseFloat(params.amount) > 0) {
      const count = await burstEnvelopeEvents(tx, {
        envelopeId,
        name: params.name,
        amount: params.amount,
        rrule: params.rrule,
        startDate: params.startDate,
        endDate: params.endDate,
        tenantId: params.tenantId,
        appId: params.appId,
        userId: params.userId,
        timeZone: params.timeZone,
      });

      if (count === 0) {
        await tx
          .update(envelopes)
          .set({ lastBurstDate: params.endDate || null, updatedAt: params.now, updatedBy: params.userId })
          .where(eq(envelopes.id, envelopeId));
      }
    } else {
      await tx
        .update(envelopes)
        .set({ lastBurstDate: null, updatedAt: params.now, updatedBy: params.userId })
        .where(eq(envelopes.id, envelopeId));
    }
  } else if (nameOrAmountChanged) {
    await tx
      .update(expenseEvents)
      .set({ name: params.name, expectedAmount: params.amount, updatedAt: params.now, updatedBy: params.userId })
      .where(and(eq(expenseEvents.envelopeId, envelopeId), eq(expenseEvents.status, "PENDING"), sql`${expenseEvents.archivedAt} IS NULL`));
  }
}
