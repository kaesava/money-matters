import { envelopes, expenseEvents, bankAccounts, tenants, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { UpdateEnvelopeCommand, DEFAULT_TIMEZONE } from "@money-matters/types";
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
  return await dbClient.transaction(async (tx) => {
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

    if (existing.isPrivate && existing.userId !== userId) {
      throw new Error("Envelope not found or access unauthorized.");
    }

    if (existing.bankAccountId) {
      const [existingAccount] = await tx
        .select({ isPrivate: bankAccounts.isPrivate, userId: bankAccounts.userId })
        .from(bankAccounts)
        .where(
          and(
            eq(bankAccounts.id, existing.bankAccountId),
            eq(bankAccounts.tenantId, tenantId),
            eq(bankAccounts.appId, appId)
          )
        )
        .limit(1);
      if (existingAccount?.isPrivate && existingAccount.userId !== userId) {
        throw new Error("Envelope not found or access unauthorized.");
      }
    }

    const effectiveBankAccountId = input.bankAccountId !== undefined ? input.bankAccountId : existing.bankAccountId;
    let targetAccount: { isPrivate: boolean | null; userId: string | null } | null = null;
    if (effectiveBankAccountId) {
      const [acc] = await tx
        .select({ isPrivate: bankAccounts.isPrivate, userId: bankAccounts.userId })
        .from(bankAccounts)
        .where(
          and(
            eq(bankAccounts.id, effectiveBankAccountId),
            eq(bankAccounts.tenantId, tenantId),
            eq(bankAccounts.appId, appId)
          )
        )
        .limit(1);
      if (!acc) {
        throw new Error("Linked bank account not found.");
      }
      if (acc.isPrivate && acc.userId !== userId) {
        throw new Error("Linked bank account not found.");
      }
      targetAccount = acc;
    }

    if (
      input.bankAccountId !== undefined &&
      input.bankAccountId !== existing.bankAccountId &&
      targetAccount &&
      Boolean(targetAccount.isPrivate) !== Boolean(existing.isPrivate)
    ) {
      throw new Error("Envelopes can only be moved to a bank account with the same privacy setting.");
    }

    const effectiveIsPrivate = targetAccount?.isPrivate
      ? true
      : input.isPrivate !== undefined
      ? Boolean(input.isPrivate)
      : Boolean(existing.isPrivate);

    const effectiveUserId = effectiveIsPrivate
      ? (targetAccount?.userId ?? existing.userId ?? userId)
      : null;

    const willBeSurplusTarget = input.isSurplusTarget !== undefined ? input.isSurplusTarget : existing.isSurplusTarget;

    if (willBeSurplusTarget && effectiveIsPrivate) {
      throw new Error("A Surplus Sweep Target cannot be private. Please designate another public envelope as the Surplus Sweep Target first.");
    }

    if (input.isSurplusTarget === false && existing.isSurplusTarget && !effectiveIsPrivate) {
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
      const clearConditions = [
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        eq(envelopes.isSurplusTarget, true),
        eq(envelopes.isPrivate, effectiveIsPrivate),
      ];
      if (effectiveIsPrivate && userId) {
        clearConditions.push(eq(envelopes.userId, userId));
      }
      await tx
        .update(envelopes)
        .set({ isSurplusTarget: false })
        .where(and(...clearConditions));
    }

    const { fundingMode, isPriority, ...restInput } = input;

    const rawEnvelopeType = restInput.envelopeType ?? existing.envelopeType;
    const effectiveEnvelopeType = rawEnvelopeType ?? existing.envelopeType;
    const effectiveFundingMode = fundingMode ?? existing.fundingMode ?? (effectiveEnvelopeType === "GOAL" ? "TARGET_BALANCE" : "RECURRING");
    const effectiveIsPriority = isPriority !== undefined ? isPriority : existing.isPriority;

    const isNowScheduled = effectiveEnvelopeType === "BILL" && effectiveFundingMode === "RECURRING";
    const wasScheduled = existing.envelopeType === "BILL" && existing.fundingMode === "RECURRING";

    const budgetFrequency = restInput.budgetFrequency ?? existing.budgetFrequency;
    const isOngoingGoal = effectiveEnvelopeType === "GOAL" && effectiveFundingMode === "RECURRING";
    const isTargetGoal = effectiveEnvelopeType === "GOAL" && effectiveFundingMode === "TARGET_BALANCE";

    let rrule: string | null = null;
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (isNowScheduled) {
      rrule = restInput.rrule ?? (restInput.budgetFrequency ? deriveRruleFromFrequency(budgetFrequency) : existing.rrule);
      startDate = restInput.startDate ?? (existing.startDate || computeDefaultStartDate());
      endDate = restInput.endDate !== undefined ? restInput.endDate : existing.endDate;
    } else if (isOngoingGoal) {
      rrule = restInput.rrule ?? (restInput.budgetFrequency ? deriveRruleFromFrequency(budgetFrequency) : existing.rrule);
      startDate = restInput.startDate !== undefined ? restInput.startDate : existing.startDate;
      endDate = restInput.endDate !== undefined ? restInput.endDate : existing.endDate;
    } else if (isTargetGoal) {
      rrule = null;
      startDate = null;
      endDate = restInput.endDate !== undefined ? restInput.endDate : existing.endDate;
    } else {
      // TARGET_BALANCE BILL or EVERYDAY
      rrule = null;
      startDate = null;
      endDate = null;
    }

    if (startDate && endDate && endDate < startDate) {
      throw new Error("End date cannot be earlier than start date.");
    }

    const effectiveGenerateEvents = isNowScheduled
      ? (restInput.generateEvents !== undefined ? restInput.generateEvents : existing.generateEvents)
      : false;

    const [updated] = await tx
      .update(envelopes)
      .set({
        ...restInput,
        envelopeType: effectiveEnvelopeType,
        fundingMode: effectiveFundingMode,
        isPriority: effectiveIsPriority,
        safetyBufferFloor: restInput.safetyBufferFloor !== undefined ? restInput.safetyBufferFloor || "0.00" : undefined,
        startDate,
        endDate,
        rrule,
        generateEvents: effectiveGenerateEvents,
        isPrivate: effectiveIsPrivate,
        userId: effectiveUserId,
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
    const hasExistingScheduledEvents = (pendingScheduled?.count ?? 0) > 0;

    if (!isNowScheduled) {
      // 1. Envelope is no longer a recurring bill (e.g. converted to TARGET_BALANCE or GOAL):
      // Clean up all pending scheduled events
      if (wasScheduled || hasExistingScheduledEvents) {
        await clearScheduledEnvelopeEvents(tx, envelopeId, tenantId, appId);
        await tx
          .update(envelopes)
          .set({ lastBurstDate: null, updatedAt: new Date(), updatedBy: userId })
          .where(eq(envelopes.id, envelopeId));
      }
    } else if (effectiveGenerateEvents === false) {
      // 2. Scheduled bill with auto-generation disabled:
      // Clear all existing pending scheduled events
      await clearScheduledEnvelopeEvents(tx, envelopeId, tenantId, appId);
      await tx
        .update(envelopes)
        .set({ lastBurstDate: null, updatedAt: new Date(), updatedBy: userId })
        .where(eq(envelopes.id, envelopeId));
    } else {
      // 3. Scheduled bill with auto-generation enabled
      const shouldBurstFresh =
        scheduleParametersChanged ||
        (!hasExistingScheduledEvents && effectiveGenerateEvents === true) ||
        (existing.generateEvents === false && effectiveGenerateEvents === true);

      if (shouldBurstFresh) {
        await clearScheduledEnvelopeEvents(tx, envelopeId, tenantId, appId);
        if (rrule && startDate && parseFloat(newAmountVal) > 0) {
          const [tenantRecord] = await tx
            .select({ timezone: tenants.timezone })
            .from(tenants)
            .where(eq(tenants.id, tenantId))
            .limit(1);
          const tenantTz = tenantRecord?.timezone || DEFAULT_TIMEZONE;

          const count = await burstEnvelopeEvents(tx, {
            envelopeId,
            name: updated.name,
            amount: newAmountVal,
            rrule,
            startDate,
            endDate,
            tenantId,
            appId,
            userId,
            timeZone: tenantTz,
            afterDateStr: null,
          });

          if (count === 0) {
            await tx
              .update(envelopes)
              .set({ lastBurstDate: endDate || null, updatedAt: new Date(), updatedBy: userId })
              .where(eq(envelopes.id, envelopeId));
          }
        } else {
          await tx
            .update(envelopes)
            .set({ lastBurstDate: null, updatedAt: new Date(), updatedBy: userId })
            .where(eq(envelopes.id, envelopeId));
        }
      } else if (amountChanged || nameChanged) {
        // In-place update of all unconfirmed pending events
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
                eq(expenseEvents.isScheduled, true),
                eq(expenseEvents.status, "PENDING"),
                sql`${expenseEvents.archivedAt} IS NULL`,
                eq(expenseEvents.tenantId, tenantId),
                eq(expenseEvents.appId, appId)
              )
            );
      }
    }

    return updated;
  });
}
