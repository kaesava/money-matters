import { envelopes, DbOrTx } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { UpdateEnvelopeCommand } from "@money-matters/types";
import {
  deriveRruleFromFrequency,
  computeDefaultStartDate,
  burstEnvelopeEvents,
  clearScheduledEnvelopeEvents,
} from "./envelope-schedule.js";

export async function updateEnvelopeCommand(
  envelopeId: string,
  input: z.infer<typeof UpdateEnvelopeCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  const runInTx =
    typeof dbClient.transaction === "function"
      ? (cb: (tx: DbOrTx) => Promise<typeof envelopes.$inferSelect>) => dbClient.transaction(cb)
      : (cb: (tx: DbOrTx) => Promise<typeof envelopes.$inferSelect>) => cb(dbClient);

  return await runInTx(async (tx) => {
    // 1. Fetch current envelope
    const [existing] = await tx
      .select()
      .from(envelopes)
      .where(
        and(
          eq(envelopes.id, envelopeId),
          eq(envelopes.tenantId, tenantId),
          eq(envelopes.appId, appId)
        )
      );

    if (!existing) {
      throw new Error("Envelope not found or access unauthorized.");
    }

    if (input.isSurplusTarget === true) {
      await tx
        .update(envelopes)
        .set({ isSurplusTarget: false })
        .where(
          and(
            eq(envelopes.tenantId, tenantId),
            eq(envelopes.appId, appId),
            eq(envelopes.isSurplusTarget, true)
          )
        );
    }

    const isScheduled = existing.envelopeType === "SCHEDULED_BILL";
    const budgetFrequency = input.budgetFrequency ?? existing.budgetFrequency;
    const rrule = isScheduled
      ? input.rrule ?? (input.budgetFrequency ? deriveRruleFromFrequency(budgetFrequency) : existing.rrule)
      : input.rrule ?? existing.rrule;
    const startDate = isScheduled
      ? input.startDate ?? (existing.startDate || computeDefaultStartDate())
      : input.startDate ?? existing.startDate;
    const endDate = input.endDate !== undefined ? input.endDate : existing.endDate;

    const [updated] = await tx
      .update(envelopes)
      .set({
        ...input,
        safetyBufferFloor: input.safetyBufferFloor !== undefined ? input.safetyBufferFloor || "0.00" : undefined,
        startDate,
        endDate,
        rrule,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(envelopes.id, envelopeId),
          eq(envelopes.tenantId, tenantId),
          eq(envelopes.appId, appId)
        )
      )
      .returning();

    // Re-burst scheduled events if schedule parameters or amount changed
    const scheduleChanged =
      input.rrule !== undefined ||
      input.startDate !== undefined ||
      input.endDate !== undefined ||
      input.budgetFrequency !== undefined ||
      input.enteredAmount !== undefined ||
      input.monthlyAmount !== undefined ||
      input.name !== undefined;

    if (isScheduled && scheduleChanged && rrule && startDate) {
      await clearScheduledEnvelopeEvents(tx, envelopeId, tenantId, appId);
      const amountVal = updated.enteredAmount || updated.monthlyAmount || "0.00";
      if (parseFloat(amountVal) > 0) {
        await burstEnvelopeEvents(tx, {
          envelopeId,
          name: updated.name,
          amount: amountVal,
          rrule,
          startDate,
          endDate,
          tenantId,
          appId,
          userId,
        });
      }
    }

    return updated;
  });
}
