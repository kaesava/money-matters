import { transactionLedger, envelopes, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { RecordExpenseCommand } from "@money-matters/types";
import { randomUUID } from "crypto";
import { toCents } from "@money-matters/core";

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
          eq(envelopes.appId, appId),
          sql`${envelopes.archivedAt} IS NULL`
        )
      );

    if (!envelope) {
      throw new Error("Envelope target invalid or access unauthorized.");
    }

    if (envelope.isPrivate && envelope.userId !== userId) {
      throw new Error("Unauthorized: Cannot record expenses against partner's private envelope.");
    }

    // 2. Validate sufficient envelope balance for immediate debits
    const numAmount = parseFloat(input.amount);
    if ((input.flowType || "DEBIT") === "DEBIT" && numAmount > 0) {
      const existingTxs = await tx
        .select({
          amount: transactionLedger.amount,
          flowType: transactionLedger.flowType,
        })
        .from(transactionLedger)
        .where(
          and(
            eq(transactionLedger.envelopeId, input.envelopeId),
            eq(transactionLedger.tenantId, tenantId),
            eq(transactionLedger.appId, appId),
            sql`${transactionLedger.archivedAt} IS NULL`
          )
        );

      let currentBalanceCents = 0;
      for (const t of existingTxs) {
        const valCents = toCents(t.amount);
        if (t.flowType === "CREDIT") {
          currentBalanceCents += valCents;
        } else {
          currentBalanceCents -= valCents;
        }
      }

      const requestedCents = toCents(input.amount);
      if (requestedCents > currentBalanceCents) {
        const availDollars = (currentBalanceCents / 100).toFixed(2);
        throw new Error(
          `Insufficient envelope balance. Available: ${availDollars}, requested: ${numAmount.toFixed(2)}`
        );
      }
    }

    // 3. Insert expense ledger debit
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
