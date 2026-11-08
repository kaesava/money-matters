import { envelopes, bankAccounts, DbOrTx } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { CreateEnvelopeCommand } from "@money-matters/types";
import { deriveRruleFromFrequency, computeDefaultStartDate, burstEnvelopeEvents } from "./envelope-schedule.js";

export async function createEnvelopeCommand(
  input: z.infer<typeof CreateEnvelopeCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  if (input.envelopeType === "EVERYDAY") {
    throw new Error("Creation of additional Everyday envelopes is prohibited. Each household has a single shared Everyday envelope.");
  }

  return await dbClient.transaction(async (tx) => {
    // 1. Fetch bank account to check privacy status
    const [targetAccount] = await tx
      .select({ id: bankAccounts.id, isPrivate: bankAccounts.isPrivate, userId: bankAccounts.userId })
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, input.bankAccountId), eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));

    if (!targetAccount) {
      throw new Error("Linked bank account not found.");
    }

    if (targetAccount.isPrivate && targetAccount.userId !== userId) {
      throw new Error("Linked bank account not found.");
    }

    const isPrivate = Boolean(targetAccount.isPrivate || input.isPrivate);

    // 2. Clear previous surplus target in the same scope if this one is designated
    if (input.isSurplusTarget === true) {
      const clearConditions = [
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        eq(envelopes.isSurplusTarget, true),
        eq(envelopes.isPrivate, isPrivate),
      ];
      if (isPrivate && userId) {
        clearConditions.push(eq(envelopes.userId, userId));
      }
      await tx
        .update(envelopes)
        .set({ isSurplusTarget: false })
        .where(and(...clearConditions));
    }

    const effectiveDbEnvelopeType =
      input.envelopeType === "BILL"
        ? (input.fundingMode === "RECURRING" ? "SCHEDULED_BILL" : "FLEXIBLE_BILL")
        : input.envelopeType === "GOAL"
        ? (input.goalMode === "TARGET_DATE" ? "TARGET_GOAL" : "ONGOING_GOAL")
        : input.envelopeType;

    const isScheduled = effectiveDbEnvelopeType === "SCHEDULED_BILL";
    const rrule = isScheduled
      ? input.rrule || deriveRruleFromFrequency(input.budgetFrequency)
      : input.rrule || null;
    const startDate = isScheduled
      ? input.startDate || computeDefaultStartDate()
      : input.startDate || null;
    const endDate = input.endDate || null;

    if (startDate && endDate && endDate < startDate) {
      throw new Error("End date cannot be earlier than start date.");
    }

    const [envelope] = await tx
      .insert(envelopes)
      .values({
        name: input.name,
        envelopeType: effectiveDbEnvelopeType,
        bankAccountId: input.bankAccountId,
        safetyBufferFloor: input.safetyBufferFloor || "0.00",
        monthlyAmount: input.monthlyAmount || null,
        enteredAmount: input.enteredAmount || null,
        budgetFrequency: input.budgetFrequency || "MONTHLY",
        startDate,
        endDate,
        rrule,
        goalMode: input.goalMode ?? (effectiveDbEnvelopeType === "TARGET_GOAL" ? "TARGET_DATE" : "ONGOING"),
        targetAmount: input.targetAmount || null,
        isEssential: input.isPriority ?? input.isEssential ?? false,
        isCommitted: input.isPriority ?? input.isCommitted ?? false,
        isSurplusTarget: input.isSurplusTarget ?? false,
        isPrivate,
        generateEvents: input.generateEvents ?? true,
        userId: isPrivate ? (targetAccount.userId ?? userId) : null,
        orderIndex: input.orderIndex ?? 0,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    const amountVal = input.enteredAmount || input.monthlyAmount || "0.00";
    const shouldBurst = isScheduled && input.generateEvents !== false;
    if (shouldBurst && rrule && startDate && parseFloat(amountVal) > 0) {
      await burstEnvelopeEvents(tx, {
        envelopeId: envelope.id,
        name: input.name,
        amount: amountVal,
        rrule,
        startDate,
        endDate,
        tenantId,
        appId,
        userId,
      });
    }

    return envelope;
  });
}
