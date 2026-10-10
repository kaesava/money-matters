import { expenseEvents, DbOrTx } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { generateBurstDates } from "../engine/burst-engine.js";

export function deriveRruleFromFrequency(freq?: string | null): string {
  if (freq === "WEEKLY") return "FREQ=WEEKLY;INTERVAL=1";
  if (freq === "FORTNIGHTLY") return "FREQ=WEEKLY;INTERVAL=2";
  if (freq === "ANNUALLY") return "FREQ=YEARLY;INTERVAL=1";
  return "FREQ=MONTHLY;INTERVAL=1";
}

export function computeDefaultStartDate(): string {
  const now = new Date();
  const nextMonthYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const nextMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
  const targetDate = new Date(Date.UTC(nextMonthYear, nextMonth, 1));
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(targetDate);
}

export async function burstCategoryEvents(
  tx: DbOrTx,
  params: {
    categoryId: string;
    poolId: string;
    name: string;
    amount: string;
    rrule: string;
    startDate: string;
    endDate?: string | null;
    tenantId: string;
    appId: string;
    userId: string;
  }
): Promise<number> {
  const dates = generateBurstDates(params.rrule, params.startDate, params.endDate, 12);
  if (dates.length === 0) return 0;

  const eventsToInsert = dates.map((d) => ({
    tenantId: params.tenantId,
    appId: params.appId,
    poolId: params.poolId,
    categoryId: params.categoryId,
    name: params.name,
    expectedDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(d),
    expectedAmount: params.amount,
    isScheduled: true,
    status: "PENDING" as const,
    createdBy: params.userId,
    updatedBy: params.userId,
  }));

  await tx.insert(expenseEvents).values(eventsToInsert);
  return eventsToInsert.length;
}

export async function clearScheduledCategoryEvents(
  tx: DbOrTx,
  categoryId: string,
  tenantId: string,
  appId: string
): Promise<void> {
  await tx
    .delete(expenseEvents)
    .where(
      and(
        eq(expenseEvents.categoryId, categoryId),
        eq(expenseEvents.isScheduled, true),
        eq(expenseEvents.status, "PENDING"),
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId)
      )
    );
}
