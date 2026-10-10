import { DbOrTx, expenseEvents } from "@money-matters/db";
import { randomUUID } from "crypto";
import { generateBurstDates } from "../engine/burst-engine.js";

export interface CategoryScheduleCandidate {
  name: string;
  amount: string;
  budgetFrequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY";
  poolId: string;
  categoryId: string;
  startDate?: string | null;
  endDate?: string | null;
  rrule?: string | null;
}

export function computeBillScheduleAnchorDate(
  budgetFrequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY",
  refDate: Date = new Date()
): string {
  if (budgetFrequency === "WEEKLY") {
    const target = new Date(refDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(target);
  }
  if (budgetFrequency === "FORTNIGHTLY") {
    const target = new Date(refDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(target);
  }

  // Monthly / Annually: 1st of next month in Australia/Sydney
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "numeric",
  }).formatToParts(refDate);

  const yearVal = parseInt(parts.find((p) => p.type === "year")?.value || `${refDate.getFullYear()}`, 10);
  const monthVal = parseInt(parts.find((p) => p.type === "month")?.value || `${refDate.getMonth() + 1}`, 10);

  let nextMonth = monthVal + 1;
  let nextYear = yearVal;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const mm = String(nextMonth).padStart(2, "0");
  return `${nextYear}-${mm}-01`;
}

export function deriveRrule(budgetFrequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY"): string {
  switch (budgetFrequency) {
    case "WEEKLY":
      return "FREQ=WEEKLY";
    case "FORTNIGHTLY":
      return "FREQ=WEEKLY;INTERVAL=2";
    case "ANNUALLY":
      return "FREQ=YEARLY";
    case "MONTHLY":
    default:
      return "FREQ=MONTHLY";
  }
}

export function buildCategoryEventPayloads(
  candidates: CategoryScheduleCandidate[],
  tenantId: string,
  appId: string,
  userId: string,
  now: Date
) {
  const eventsToInsert: Array<typeof expenseEvents.$inferInsert> = [];

  for (const item of candidates) {
    const rrule = item.rrule || deriveRrule(item.budgetFrequency);
    const startDate = item.startDate || computeBillScheduleAnchorDate(item.budgetFrequency, now);

    const burstDates = generateBurstDates(rrule, startDate, item.endDate || null, 12);
    for (const d of burstDates) {
      eventsToInsert.push({
        id: randomUUID(),
        tenantId,
        appId,
        poolId: item.poolId,
        categoryId: item.categoryId,
        name: item.name,
        expectedDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(d),
        expectedAmount: item.amount,
        isScheduled: true,
        status: "PENDING",
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
      });
    }
  }

  return { eventsToInsert };
}

export async function insertCategoryEventsBulk(
  tx: DbOrTx,
  events: Array<typeof expenseEvents.$inferInsert>
): Promise<number> {
  if (events.length > 0) {
    await tx.insert(expenseEvents).values(events);
  }
  return events.length;
}
