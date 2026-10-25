import { DbOrTx, expenseEvents, incomeEvents } from "@money-matters/db";
import { randomUUID } from "crypto";
import { generateBurstDates } from "../engine/burst-engine.js";

export interface EnvelopeScheduleCandidate {
  name: string;
  amount: string;
  budgetFrequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY";
  envelopeId: string;
  startDate?: string | null;
  endDate?: string | null;
  rrule?: string | null;
}

export function computeBillScheduleAnchorDate(
  budgetFrequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY",
  refDate: Date = new Date(),
  timeZone: string = "Australia/Sydney"
): string {
  if (budgetFrequency === "WEEKLY") {
    const target = new Date(refDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(target);
  }
  if (budgetFrequency === "FORTNIGHTLY") {
    const target = new Date(refDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(target);
  }

  // Monthly / Annually: 1st of next month in dynamic timezone
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
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

export function buildEnvelopeEventPayloads(
  candidates: EnvelopeScheduleCandidate[],
  tenantId: string,
  appId: string,
  userId: string,
  now: Date,
  timeZone: string = "Australia/Sydney"
) {
  const eventsToInsert: Array<typeof expenseEvents.$inferInsert> = [];

  for (const item of candidates) {
    const rrule = item.rrule || deriveRrule(item.budgetFrequency);
    const startDate = item.startDate || computeBillScheduleAnchorDate(item.budgetFrequency, now, timeZone);

    const burstDates = generateBurstDates(rrule, startDate, item.endDate || null, 12);
    for (const d of burstDates) {
      eventsToInsert.push({
        id: randomUUID(),
        tenantId,
        appId,
        envelopeId: item.envelopeId,
        name: item.name,
        expectedDate: new Intl.DateTimeFormat("en-CA", { timeZone }).format(d),
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

export async function insertEnvelopeEventsBulk(
  tx: DbOrTx,
  events: Array<typeof expenseEvents.$inferInsert>
): Promise<number> {
  if (events.length > 0) {
    await tx.insert(expenseEvents).values(events);
  }
  return events.length;
}

export interface IncomeScheduleCandidate {
  incomeSourceId: string;
  name: string;
  amount: string;
  rrule: string;
  startDate: string;
  endDate?: string | null;
}

export function buildIncomeEventPayloads(
  candidates: IncomeScheduleCandidate[],
  existingDatesBySource: Map<string, Set<string>>,
  tenantId: string,
  appId: string,
  userId: string,
  now: Date
) {
  const eventsToInsert: Array<typeof incomeEvents.$inferInsert> = [];

  for (const item of candidates) {
    const existingDates = existingDatesBySource.get(item.incomeSourceId) ?? new Set<string>();
    const burstDates = generateBurstDates(item.rrule, item.startDate, item.endDate || null, 12);

    for (const d of burstDates) {
      const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(d);
      if (existingDates.has(dateStr)) continue;

      eventsToInsert.push({
        id: randomUUID(),
        tenantId,
        appId,
        incomeSourceId: item.incomeSourceId,
        name: item.name,
        expectedDate: dateStr,
        actualDate: dateStr,
        expectedAmount: item.amount,
        actualAmount: item.amount,
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

export async function insertIncomeEventsBulk(
  tx: DbOrTx,
  events: Array<typeof incomeEvents.$inferInsert>
): Promise<number> {
  if (events.length > 0) {
    await tx.insert(incomeEvents).values(events);
  }
  return events.length;
}
