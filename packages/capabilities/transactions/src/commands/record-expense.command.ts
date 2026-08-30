import { transactionLedger, pools, DbOrTx } from "@money-matters/db";
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
    // 1. Confirm pool access
    const [pool] = await tx
      .select()
      .from(pools)
      .where(
        and(
          eq(pools.id, input.poolId),
          eq(pools.tenantId, tenantId),
          eq(pools.appId, appId)
        )
      );

    if (!pool) {
      throw new Error("Pool target invalid or access unauthorized.");
    }

    // 2. Insert expense ledger debit
    const [expense] = await tx
      .insert(transactionLedger)
      .values({
        poolId: input.poolId,
        categoryId: input.categoryId || null,
        bankAccountId: input.bankAccountId || null,
        flowType: input.flowType || "DEBIT",
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
