import { db, transactionLedger, categories } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { MoveMoneyCommand } from "@money-matters/types";
import { randomUUID } from "crypto";

export async function moveMoneyCommand(
  input: z.infer<typeof MoveMoneyCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  return await dbClient.transaction(async (tx) => {
    // 1. Verify access to source category
    const [sourceCat] = await tx
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, input.sourceCategoryId),
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId)
        )
      );

    if (!sourceCat) {
      throw new Error("Source category invalid or access unauthorized.");
    }

    // 2. Verify access to destination category
    const [destCat] = await tx
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, input.destinationCategoryId),
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId)
        )
      );

    if (!destCat) {
      throw new Error("Destination category invalid or access unauthorized.");
    }

    const note = `Transferred ${input.amount} from ${sourceCat.name} to ${destCat.name}`;
    const timestamp = new Date();
    const commonId = randomUUID();

    // 3. Insert DEBIT transaction from source
    await tx.insert(transactionLedger).values({
      categoryId: input.sourceCategoryId,
      flowType: "DEBIT",
      amount: input.amount,
      idempotencyKey: `move-debit-${commonId}`,
      note,
      source: "MANUAL",
      recordedAt: timestamp,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    });

    // 4. Insert CREDIT transaction to destination
    await tx.insert(transactionLedger).values({
      categoryId: input.destinationCategoryId,
      flowType: "CREDIT",
      amount: input.amount,
      idempotencyKey: `move-credit-${commonId}`,
      note,
      source: "MANUAL",
      recordedAt: timestamp,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    });

    return { success: true };
  });
}
