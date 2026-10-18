import { DbOrTx, expenseEvents } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import {
  EnvelopeScheduleCandidate,
  buildEnvelopeEventPayloads,
  insertEnvelopeEventsBulk,
} from "./save-setup-budget-helpers.js";
import { SaveSetupEnvelopeInput } from "./save-setup-budget-envelopes.js";

export async function processSetupScheduledBills(
  tx: DbOrTx,
  envelopesInput: SaveSetupEnvelopeInput[],
  envelopeIdMap: Map<string, string>,
  tenantId: string,
  appId: string,
  userId: string,
  now: Date
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
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );

  const candidates: EnvelopeScheduleCandidate[] = [];

  for (const envInput of envelopesInput) {
    if (envInput.envelopeType !== "SCHEDULED_BILL") continue;

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
    const { eventsToInsert } = buildEnvelopeEventPayloads(candidates, tenantId, appId, userId, now);
    return await insertEnvelopeEventsBulk(tx, eventsToInsert);
  }

  return 0;
}
