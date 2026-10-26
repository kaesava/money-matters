import { envelopes, expenseEvents, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
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

    const effectiveIsPrivate = input.isPrivate !== undefined ? Boolean(input.isPrivate) : Boolean(existing.isPrivate);

    if (input.isSurplusTarget === true && effectiveIsPrivate) {
      throw new Error("A private envelope cannot be designated as the household Surplus Sweep Target.");
    }

    if (input.isSurplusTarget === false && existing.isSurplusTarget) {
      const otherSurplusTargets = await tx
        .select({ id: envelopes.id })
        .from(envelopes)
        .where(
          and(
            eq(envelopes.tenantId, tenantId),
            eq(envelopes.appId, appId),
            eq(envelopes.isSurplusTarget, true),
            eq(envelopes.isPrivate, false)
          )
        );
      if (otherSurplusTargets.length <= 1) {
        throw new Error("The household must have at least one public Surplus Sweep Target.");
      }
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

    const effectiveEnvelopeType = input.envelopeType ?? existing.envelopeType;
    const isNowScheduled = effectiveEnvelopeType === "SCHEDULED_BILL";
    const wasScheduled = existing.envelopeType === "SCHEDULED_BILL";

    const budgetFrequency = input.budgetFrequency ?? existing.budgetFrequency;
    const isTargetGoal = effectiveEnvelopeType === "TARGET_GOAL";
    const isOngoingGoal = effectiveEnvelopeType === "ONGOING_GOAL";

    let rrule: string | null = null;
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (isNowScheduled) {
      rrule = input.rrule ?? (input.budgetFrequency ? deriveRruleFromFrequency(budgetFrequency) : existing.rrule);
      startDate = input.startDate ?? (existing.startDate || computeDefaultStartDate());
      endDate = input.endDate !== undefined ? input.endDate : existing.endDate;
    } else if (isOngoingGoal) {
      rrule = input.rrule ?? (input.budgetFrequency ? deriveRruleFromFrequency(budgetFrequency) : existing.rrule);
      startDate = input.startDate !== undefined ? input.startDate : existing.startDate;
      endDate = null;
    } else if (isTargetGoal) {
      rrule = null;
      startDate = null;
      endDate = input.endDate !== undefined ? input.endDate : existing.endDate;
    } else {
      // FLEXIBLE_BILL or EVERYDAY
      rrule = null;
      startDate = null;
      endDate = null;
    }

    const [updated] = await tx
      .update(envelopes)
      .set({
        ...input,
        envelopeType: effectiveEnvelopeType,
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

    // Determine event handling according to the permutation matrix:
    const scheduleParametersChanged =
      (input.rrule !== undefined && input.rrule !== existing.rrule) ||
      (input.startDate !== undefined && input.startDate !== existing.startDate) ||
      (input.endDate !== undefined && input.endDate !== (existing.endDate || null)) ||
      (input.budgetFrequency !== undefined && input.budgetFrequency !== existing.budgetFrequency) ||
      (wasScheduled !== isNowScheduled);

    const oldAmountVal = existing.enteredAmount || existing.monthlyAmount || "0.00";
    const newAmountVal = updated.enteredAmount || updated.monthlyAmount || "0.00";
    const amountChanged = parseFloat(newAmountVal) !== parseFloat(oldAmountVal);

    const nameChanged = input.name !== undefined && input.name.trim() !== existing.name.trim();

    let hasExistingScheduledEvents = false;
    if (typeof tx.select === "function") {
      try {
        const [pendingScheduled] = await tx
          .select({ count: sql<number>`count(*)`.mapWith(Number) })
          .from(expenseEvents)
          .where(
            and(
              eq(expenseEvents.envelopeId, envelopeId),
              eq(expenseEvents.isScheduled, true),
              eq(expenseEvents.status, "PENDING"),
              eq(expenseEvents.tenantId, tenantId),
              eq(expenseEvents.appId, appId),
              sql`${expenseEvents.archivedAt} IS NULL`
            )
          );
        hasExistingScheduledEvents = (pendingScheduled?.count ?? 0) > 0;
      } catch {
        // Fallback for mock DBs
      }
    }

    if (!isNowScheduled) {
      // 1. Envelope is no longer a scheduled bill (e.g. converted to FLEXIBLE_BILL or GOAL):
      // Clean up all pending scheduled events
      if (wasScheduled || hasExistingScheduledEvents) {
        await clearScheduledEnvelopeEvents(tx, envelopeId, tenantId, appId);
      }
    } else if (input.generateEvents === false) {
      // 2. Scheduled bill with auto-generation disabled:
      // Clear all existing pending scheduled events
      await clearScheduledEnvelopeEvents(tx, envelopeId, tenantId, appId);
    } else {
      // 3. Scheduled bill with auto-generation enabled (input.generateEvents !== false)
      const shouldBurstFresh =
        scheduleParametersChanged ||
        (!hasExistingScheduledEvents && input.generateEvents === true);

      if (shouldBurstFresh) {
        await clearScheduledEnvelopeEvents(tx, envelopeId, tenantId, appId);
        if (rrule && startDate && parseFloat(newAmountVal) > 0) {
          await burstEnvelopeEvents(tx, {
            envelopeId,
            name: updated.name,
            amount: newAmountVal,
            rrule,
            startDate,
            endDate,
            tenantId,
            appId,
            userId,
          });
        }
      } else if (amountChanged || nameChanged) {
        // In-place update of all unconfirmed pending events
        if (typeof tx.update === "function") {
          const updatePayload: Record<string, unknown> = {
            updatedBy: userId,
            updatedAt: new Date(),
          };
          if (nameChanged) updatePayload.name = updated.name;
          if (amountChanged) updatePayload.expectedAmount = newAmountVal;

          await tx
            .update(expenseEvents)
            .set(updatePayload)
            .where(
              and(
                eq(expenseEvents.envelopeId, envelopeId),
                eq(expenseEvents.status, "PENDING"),
                eq(expenseEvents.tenantId, tenantId),
                eq(expenseEvents.appId, appId)
              )
            );
        }
      }
    }

    return updated;
  });
}
