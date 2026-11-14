import { DbOrTx, expenseEvents, incomeEvents, envelopes, incomeSources } from "@money-matters/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getTenantDateString } from "@money-matters/core";
import { burstEnvelopeEvents } from "./envelope-schedule.js";
import { burstIncomeEvents } from "./income-schedule.js";

export async function archivePendingIncomeEvents(
  tx: DbOrTx,
  tenantId: string,
  archivedIncomeIds: string[]
): Promise<void> {
  if (archivedIncomeIds.length === 0) return;
  await tx
    .delete(incomeEvents)
    .where(
      and(
        eq(incomeEvents.tenantId, tenantId),
        inArray(incomeEvents.incomeSourceId, archivedIncomeIds),
        eq(incomeEvents.status, "PENDING")
      )
    );
}

export async function archivePendingExpenseEvents(
  tx: DbOrTx,
  tenantId: string,
  archivedEnvelopeIds: string[]
): Promise<void> {
  if (archivedEnvelopeIds.length === 0) return;
  await tx
    .delete(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, tenantId),
        inArray(expenseEvents.envelopeId, archivedEnvelopeIds),
        eq(expenseEvents.status, "PENDING")
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
      .delete(incomeEvents)
      .where(
        and(
          eq(incomeEvents.tenantId, params.tenantId),
          eq(incomeEvents.incomeSourceId, sourceId),
          eq(incomeEvents.status, "PENDING")
        )
      );

    const tz = params.timeZone || "Australia/Sydney";
    const todayStr = getTenantDateString(params.now, { timezone: tz });
    const yesterdayStr = getTenantDateString(new Date(params.now.getTime() - 86400000), { timezone: tz });
    const afterDateStr = params.startDate < todayStr ? yesterdayStr : null;

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
      afterDateStr,
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
      .where(
        and(
          eq(incomeEvents.tenantId, params.tenantId),
          eq(incomeEvents.incomeSourceId, sourceId),
          eq(incomeEvents.status, "PENDING"),
          sql`${incomeEvents.archivedAt} IS NULL`
        )
      );
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
      .delete(expenseEvents)
      .where(
        and(
          eq(expenseEvents.tenantId, params.tenantId),
          eq(expenseEvents.envelopeId, envelopeId),
          eq(expenseEvents.isScheduled, true),
          eq(expenseEvents.status, "PENDING")
        )
      );

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
        afterDateStr: null,
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
      .where(
        and(
          eq(expenseEvents.tenantId, params.tenantId),
          eq(expenseEvents.envelopeId, envelopeId),
          eq(expenseEvents.isScheduled, true),
          eq(expenseEvents.status, "PENDING"),
          sql`${expenseEvents.archivedAt} IS NULL`
        )
      );
  }
}
