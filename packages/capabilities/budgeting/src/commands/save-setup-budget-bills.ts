import { DbOrTx, expenseEvents, envelopes } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import {
  EnvelopeScheduleCandidate,
  buildEnvelopeEventPayloads,
  insertEnvelopeEventsBulk,
} from "./save-setup-budget-calculators.js";
import { SaveSetupEnvelopeInput } from "./save-setup-budget-envelopes.js";

export async function processSetupScheduledBills(
  tx: DbOrTx,
  envelopesInput: SaveSetupEnvelopeInput[],
  envelopeIdMap: Map<string, string>,
  tenantId: string,
  appId: string,
  userId: string,
  now: Date,
  timeZone: string = "Australia/Sydney"
): Promise<number> {
  const existingScheduledEvents = await tx
    .select({
      id: expenseEvents.id,
      envelopeId: expenseEvents.envelopeId,
    })
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        eq(expenseEvents.isScheduled, true),
        eq(expenseEvents.status, "PENDING"),
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );

  const candidates: EnvelopeScheduleCandidate[] = [];

  for (const envInput of envelopesInput) {
    const isRecurringBill = envInput.envelopeType === "BILL" && (envInput.fundingMode === "RECURRING" || envInput.fundingMode === undefined);
    if (!isRecurringBill || envInput.generateEvents === false) continue;

    const amountVal = envInput.enteredAmount || envInput.monthlyAmount || "0.00";
    if (parseFloat(amountVal) <= 0) continue;

    const envId = (envInput.id && envelopeIdMap.get(envInput.id)) || envelopeIdMap.get(`name-${envInput.name}`);
    if (!envId) continue;

    const hasExisting = existingScheduledEvents.some((e) => e.envelopeId === envId);
    if (hasExisting) continue;

    candidates.push({
      name: envInput.name,
      amount: amountVal,
      budgetFrequency: envInput.budgetFrequency || "MONTHLY",
      envelopeId: envId,
      startDate: envInput.startDate,
      endDate: envInput.endDate,
      rrule: envInput.rrule,
    });
  }

  if (candidates.length > 0) {
    const { eventsToInsert } = buildEnvelopeEventPayloads(candidates, tenantId, appId, userId, now, timeZone);
    const count = await insertEnvelopeEventsBulk(tx, eventsToInsert);

    if (eventsToInsert.length > 0) {
      const maxDateByEnvelope = new Map<string, string>();
      for (const ev of eventsToInsert) {
        if (!ev.envelopeId || !ev.expectedDate) continue;
        const cur = maxDateByEnvelope.get(ev.envelopeId);
        if (!cur || ev.expectedDate > cur) {
          maxDateByEnvelope.set(ev.envelopeId, ev.expectedDate);
        }
      }
      for (const [envelopeId, maxDate] of maxDateByEnvelope.entries()) {
        await tx
          .update(envelopes)
          .set({ lastBurstDate: maxDate, updatedAt: now, updatedBy: userId })
          .where(eq(envelopes.id, envelopeId));
      }
    }

    return count;
  }

  return 0;
}
