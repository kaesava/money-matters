import { db, transactionLedger, categories } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { RecordExpenseCommand } from "@money-matters/types";
import { randomUUID } from "crypto";

export async function recordExpenseCommand(
  input: z.infer<typeof RecordExpenseCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  return await dbClient.transaction(async (tx) => {
    // 1. Confirm category access
    const [cat] = await tx
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, input.categoryId),
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId)
        )
      );

    if (!cat) {
      throw new Error("Category target invalid or access unauthorized.");
    }

    // 2. Insert expense ledger debit
    const [expense] = await tx
      .insert(transactionLedger)
      .values({
        categoryId: input.categoryId,
        bankAccountId: input.bankAccountId || null,
        flowType: "DEBIT",
        amount: input.amount,
        idempotencyKey: input.idempotencyKey || `expense-manual-${randomUUID()}`,
        note: input.note || null,
        source: input.source || "MANUAL",
        recordedAt: input.date ? new Date(input.date) : new Date(),
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return expense;
  });
}
