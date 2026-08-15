import { transactionLedger, categories, DbOrTx } from "@money-matters/db";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { CommitCsvImportCommand } from "@money-matters/types";

export async function commitCsvImportCommand(
  input: z.infer<typeof CommitCsvImportCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
): Promise<{ importedCount: number; skippedDuplicatesCount: number }> {
  if (!input.transactions || input.transactions.length === 0) {
    return { importedCount: 0, skippedDuplicatesCount: 0 };
  }

  return await dbClient.transaction(async (tx) => {
    // 1. Fetch default Everyday Pool category for fallback
    const tenantCategories = await tx
      .select({ id: categories.id, type: categories.type })
      .from(categories)
      .where(
        and(
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId)
        )
      );

    const validCatIds = new Set(tenantCategories.map((c) => c.id));
    const everydayCat = tenantCategories.find((c) => c.type === "EVERYDAY") || tenantCategories[0];

    if (!everydayCat) {
      throw new Error("No valid budget category found for this tenant.");
    }

    // 2. Query existing idempotency keys to avoid duplicates
    const idempotencyKeys = input.transactions.map((t) => t.idempotencyKey);
    const existingRows = await tx
      .select({ idempotencyKey: transactionLedger.idempotencyKey })
      .from(transactionLedger)
      .where(
        and(
          eq(transactionLedger.tenantId, tenantId),
          eq(transactionLedger.appId, appId),
          inArray(transactionLedger.idempotencyKey, idempotencyKeys)
        )
      );

    const existingKeysSet = new Set(existingRows.map((r) => r.idempotencyKey));

    // 3. Filter out existing duplicates
    const newTransactions = input.transactions.filter(
      (t) => !existingKeysSet.has(t.idempotencyKey)
    );

    const skippedDuplicatesCount = input.transactions.length - newTransactions.length;

    if (newTransactions.length === 0) {
      return { importedCount: 0, skippedDuplicatesCount };
    }

    // 4. Construct bulk values
    const insertValues = newTransactions.map((t) => {
      const targetCatId = t.categoryId && validCatIds.has(t.categoryId) ? t.categoryId : everydayCat.id;
      const recordedAt = t.date ? new Date(t.date) : new Date();

      return {
        categoryId: targetCatId,
        bankAccountId: input.bankAccountId || null,
        flowType: t.flowType,
        amount: t.amount,
        idempotencyKey: t.idempotencyKey,
        note: t.note || t.description,
        source: "IMPORT" as const,
        recordedAt,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      };
    });

    // 5. Bulk insert (single query, Rule #6 compliance)
    await tx.insert(transactionLedger).values(insertValues);

    return {
      importedCount: insertValues.length,
      skippedDuplicatesCount,
    };
  });
}
