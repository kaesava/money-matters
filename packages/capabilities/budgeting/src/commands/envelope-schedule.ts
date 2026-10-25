import { expenseEvents, DbOrTx } from "@money-matters/db";
import { and, eq } from "drizzle-orm";
import { generateBurstDates } from "../engine/burst-engine.js";

export function deriveRruleFromFrequency(freq?: string | null): string {
  if (freq === "WEEKLY") return "FREQ=WEEKLY;INTERVAL=1";
  if (freq === "FORTNIGHTLY") return "FREQ=WEEKLY;INTERVAL=2";
  if (freq === "ANNUALLY") return "FREQ=YEARLY;INTERVAL=1";
  return "FREQ=MONTHLY;INTERVAL=1";
}

export function computeDefaultStartDate(timeZone = "Australia/Sydney"): string {
  const now = new Date();
  const nextMonthYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const nextMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
  const targetDate = new Date(Date.UTC(nextMonthYear, nextMonth, 1));
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(targetDate);
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
  }
): Promise<number> {
  const dates = generateBurstDates(params.rrule, params.startDate, params.endDate, 12);
  if (dates.length === 0) return 0;
  const tz = params.timeZone || "Australia/Sydney";

  const eventsToInsert = dates.map((d) => ({
    tenantId: params.tenantId,
    appId: params.appId,
    envelopeId: params.envelopeId,
    name: params.name,
    expectedDate: new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d),
    expectedAmount: params.amount,
    isScheduled: true,
    status: "PENDING" as const,
    createdBy: params.userId,
    updatedBy: params.userId,
  }));

  await tx.insert(expenseEvents).values(eventsToInsert);
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
