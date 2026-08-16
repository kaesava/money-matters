import { transactionLedger, categories, tenants, DbOrTx } from "@money-matters/db";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { CommitCsvImportCommand } from "@money-matters/types";
import { randomUUID } from "crypto";

export async function commitCsvImportCommand(
  input: z.infer<typeof CommitCsvImportCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
): Promise<{ importedCount: number; skippedDuplicatesCount: number; batchId: string }> {
  const batchId = randomUUID();

  if (!input.transactions || input.transactions.length === 0) {
    return { importedCount: 0, skippedDuplicatesCount: 0, batchId };
  }

  return await dbClient.transaction(async (tx) => {
    // 1. Fetch default Everyday Pool category for fallback
    const tenantCategories = await tx
      .select({ id: categories.id, name: categories.name, type: categories.type })
      .from(categories)
      .where(
        and(
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId)
        )
      );

    const categoryMap = new Map(tenantCategories.map((c) => [c.id, c]));
    const validCatIds = new Set(tenantCategories.map((c) => c.id));
    const everydayCat = tenantCategories.find((c) => c.type === "EVERYDAY") || tenantCategories[0];

    if (!everydayCat) {
      throw new Error("No valid budget category found for this tenant.");
    }

    // 2. Query existing idempotency keys in chunks of 200 to avoid parameter limits
    const idempotencyKeys = input.transactions.map((t) => t.idempotencyKey);
    const existingKeysSet = new Set<string>();
    const CHUNK_SIZE = 200;

    for (let i = 0; i < idempotencyKeys.length; i += CHUNK_SIZE) {
      const chunk = idempotencyKeys.slice(i, i + CHUNK_SIZE);
      const existingRows = await tx
        .select({ idempotencyKey: transactionLedger.idempotencyKey })
        .from(transactionLedger)
        .where(
          and(
            eq(transactionLedger.tenantId, tenantId),
            eq(transactionLedger.appId, appId),
            inArray(transactionLedger.idempotencyKey, chunk)
          )
        );
      for (const row of existingRows) {
        existingKeysSet.add(row.idempotencyKey);
      }
    }

    // 3. Filter out existing duplicates
    const newTransactions = input.transactions.filter(
      (t) => !existingKeysSet.has(t.idempotencyKey)
    );

    const skippedDuplicatesCount = input.transactions.length - newTransactions.length;

    if (newTransactions.length === 0) {
      return { importedCount: 0, skippedDuplicatesCount, batchId };
    }

    // 4. Construct bulk values & learn merchant rules
    const learnedRules: Record<string, string> = {};

    const insertValues = newTransactions.map((t) => {
      const targetCatId = t.categoryId && validCatIds.has(t.categoryId) ? t.categoryId : everydayCat.id;
      const recordedAt = t.date ? new Date(t.date) : new Date();
      const matchedCat = categoryMap.get(targetCatId);

      // Learn merchant keyword rule if user mapped DEBIT to a non-default category
      if (t.flowType === "DEBIT" && matchedCat && t.description) {
        const cleanKeyword = t.description
          .toLowerCase()
          .replace(/[^a-z\s]/g, "")
          .trim()
          .split(/\s+/)[0]; // Extract primary merchant word

        if (cleanKeyword && cleanKeyword.length >= 3) {
          learnedRules[cleanKeyword] = matchedCat.name;
        }
      }

      return {
        categoryId: targetCatId,
        bankAccountId: input.bankAccountId || null,
        flowType: t.flowType,
        amount: t.amount,
        idempotencyKey: t.idempotencyKey,
        note: t.note || t.description,
        source: "IMPORT" as const,
        transferGroupId: batchId,
        recordedAt,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      };
    });

    // 5. Bulk insert in chunks of 200 to enforce Rule #6 without parameter overflow
    for (let i = 0; i < insertValues.length; i += CHUNK_SIZE) {
      const valueChunk = insertValues.slice(i, i + CHUNK_SIZE);
      await tx.insert(transactionLedger).values(valueChunk);
    }

    // 6. Update tenant merchantRules in DB if new rules learned
    if (Object.keys(learnedRules).length > 0) {
      const tenantRow = await tx
        .select({ merchantRules: tenants.merchantRules })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      const existingRules = tenantRow[0]?.merchantRules || {};
      const updatedRules = { ...existingRules, ...learnedRules };

      await tx
        .update(tenants)
        .set({ merchantRules: updatedRules })
        .where(eq(tenants.id, tenantId));
    }

    return {
      importedCount: insertValues.length,
      skippedDuplicatesCount,
      batchId,
    };
  });
}
