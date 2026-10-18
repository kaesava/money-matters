import { transactionLedger, envelopes, DbOrTx } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { RecordExpenseCommand } from "@money-matters/types";
import { randomUUID } from "crypto";

export async function recordExpenseCommand(
  input: z.infer<typeof RecordExpenseCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  return await dbClient.transaction(async (tx) => {
    // 1. Confirm envelope access
    const [envelope] = await tx
      .select()
      .from(envelopes)
      .where(
        and(
          eq(envelopes.id, input.envelopeId),
          eq(envelopes.tenantId, tenantId),
          eq(envelopes.appId, appId)
        )
      );

    if (!envelope) {
      throw new Error("Envelope target invalid or access unauthorized.");
    }

    if (envelope.isPrivate && envelope.userId !== userId) {
      throw new Error("Unauthorized: Cannot record expenses against partner's private envelope.");
    }

    // 2. Insert expense ledger debit
    const [expense] = await tx
      .insert(transactionLedger)
      .values({
        envelopeId: input.envelopeId,
        bankAccountId: input.bankAccountId || envelope.bankAccountId || null,
        flowType: input.flowType || "DEBIT",
        transactionType: input.transactionType || "EXPENSE",
        amount: input.amount,
        idempotencyKey: input.idempotencyKey || `expense-manual-${randomUUID()}`,
        note: input.note || null,
        source: input.source || "MANUAL",
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : input.date ? new Date(input.date) : new Date(),
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return expense;
  });
}
