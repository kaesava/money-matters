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

  const runInTx =
    typeof dbClient.transaction === "function"
      ? (cb: (tx: DbOrTx) => Promise<typeof envelopes.$inferSelect>) => dbClient.transaction(cb)
      : (cb: (tx: DbOrTx) => Promise<typeof envelopes.$inferSelect>) => cb(dbClient);

  return await runInTx(async (tx) => {
    // 1. Fetch bank account to check privacy status
    const [targetAccount] = await tx
      .select({ id: bankAccounts.id, isPrivate: bankAccounts.isPrivate, userId: bankAccounts.userId })
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, input.bankAccountId), eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));

    if (!targetAccount) {
      throw new Error("Linked bank account not found.");
    }

    const isPrivate = Boolean(input.isPrivate ?? targetAccount.isPrivate);

    // 2. Clear previous surplus target if this one is designated
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

    const isScheduled = input.envelopeType === "SCHEDULED_BILL";
    const rrule = isScheduled
      ? input.rrule || deriveRruleFromFrequency(input.budgetFrequency)
      : input.rrule || null;
    const startDate = isScheduled
      ? input.startDate || computeDefaultStartDate()
      : input.startDate || null;
    const endDate = input.endDate || null;

    const [envelope] = await tx
      .insert(envelopes)
      .values({
        name: input.name,
        envelopeType: input.envelopeType,
        bankAccountId: input.bankAccountId,
        safetyBufferFloor: input.safetyBufferFloor || "0.00",
        monthlyAmount: input.monthlyAmount || null,
        enteredAmount: input.enteredAmount || null,
        budgetFrequency: input.budgetFrequency || "MONTHLY",
        startDate,
        endDate,
        rrule,
        goalMode: input.goalMode ?? (input.envelopeType === "TARGET_GOAL" ? "TARGET_DATE" : "ONGOING"),
        targetAmount: input.targetAmount || null,
        isEssential: input.isEssential ?? false,
        isCommitted: input.isCommitted ?? false,
        isSurplusTarget: input.isSurplusTarget ?? false,
        isPrivate,
        userId: isPrivate ? (targetAccount.userId ?? userId) : null,
        orderIndex: input.orderIndex ?? 0,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    const amountVal = input.enteredAmount || input.monthlyAmount || "0.00";
    if (isScheduled && rrule && startDate && parseFloat(amountVal) > 0) {
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
