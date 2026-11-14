import { expenseEvents, envelopes, DbOrTx } from "@money-matters/db";
import { and, eq } from "drizzle-orm";
import { getTenantDateString } from "@money-matters/core";
import { generateBurstDates } from "../engine/burst-engine.js";

export function deriveRruleFromFrequency(freq?: string | null): string {
  if (freq === "WEEKLY") return "FREQ=WEEKLY;INTERVAL=1";
  if (freq === "FORTNIGHTLY") return "FREQ=WEEKLY;INTERVAL=2";
  if (freq === "QUARTERLY") return "FREQ=MONTHLY;INTERVAL=3";
  if (freq === "ANNUALLY") return "FREQ=YEARLY;INTERVAL=1";
  return "FREQ=MONTHLY;INTERVAL=1";
}

export function computeDefaultStartDate(timeZone = "Australia/Sydney"): string {
  const todayStr = getTenantDateString(new Date(), { timezone: timeZone });
  const [yearStr, monthStr] = todayStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

export async function burstEnvelopeEvents(
  tx: DbOrTx,
  params: {
    envelopeId: string;
    name: string;
    amount: string;
    rrule: string;
    startDate: string;
    endDate?: string | null;
    tenantId: string;
    appId: string;
    userId: string;
    timeZone?: string;
    afterDateStr?: string | null;
  }
): Promise<number> {
  const dates = generateBurstDates(params.rrule, params.startDate, params.endDate, 12, 1000, params.afterDateStr);
  if (dates.length === 0) return 0;
  const eventsToInsert = dates.map((d) => ({
    tenantId: params.tenantId,
    appId: params.appId,
    envelopeId: params.envelopeId,
    name: params.name,
    // generateBurstDates yields UTC-midnight calendar dates; slice ISO date directly to avoid negative-UTC-offset -1 day shifts.
    expectedDate: d.toISOString().slice(0, 10),
    expectedAmount: params.amount,
    isScheduled: true,
    status: "PENDING" as const,
    createdBy: params.userId,
    updatedBy: params.userId,
  }));

  const insertQuery = tx.insert(expenseEvents).values(eventsToInsert);
  if ("onConflictDoNothing" in insertQuery && typeof (insertQuery as { onConflictDoNothing?: unknown }).onConflictDoNothing === "function") {
    await (insertQuery as { onConflictDoNothing: () => Promise<unknown> }).onConflictDoNothing();
  } else {
    await insertQuery;
  }

  const lastDate = eventsToInsert[eventsToInsert.length - 1].expectedDate;
  await tx
    .update(envelopes)
    .set({
      lastBurstDate: lastDate,
      updatedAt: new Date(),
      updatedBy: params.userId,
    })
    .where(eq(envelopes.id, params.envelopeId));

  return eventsToInsert.length;
}

export async function clearScheduledEnvelopeEvents(
  tx: DbOrTx,
  envelopeId: string,
  tenantId: string,
  appId: string
): Promise<void> {
  await tx
    .delete(expenseEvents)
    .where(
      and(
        eq(expenseEvents.envelopeId, envelopeId),
        eq(expenseEvents.isScheduled, true),
        eq(expenseEvents.status, "PENDING"),
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId)
      )
    );
}
