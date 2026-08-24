import { transactionLedger, categories, incomeEvents, incomeSources, DbOrTx } from "@money-matters/db";
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
    // 1. Fetch tenant budget categories and income sources
    const tenantCategories = await tx
      .select({ id: categories.id, name: categories.name, type: categories.type })
      .from(categories)
      .where(
        and(
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId)
        )
      );

    const validCatIds = new Set(tenantCategories.map((c) => c.id));
    const everydayCat = tenantCategories.find((c) => c.type === "EVERYDAY") || tenantCategories[0];
    const regularCat = tenantCategories.find((c) => c.type === "REGULAR") || everydayCat;
    const goalCat = tenantCategories.find((c) => c.type === "GOAL") || everydayCat;

    if (!everydayCat) {
      throw new Error("No valid budget category found for this tenant.");
    }

    const tenantIncomeSources = await tx
      .select({ id: incomeSources.id })
      .from(incomeSources)
      .where(
        and(
          eq(incomeSources.tenantId, tenantId),
          eq(incomeSources.appId, appId)
        )
      );
    const primaryIncomeSource = tenantIncomeSources[0];

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

    // 3. Filter out items excluded by user or already imported duplicates
    const newTransactions = input.transactions.filter(
      (t) => t.isIncluded !== false && !existingKeysSet.has(t.idempotencyKey)
    );

    const skippedDuplicatesCount = input.transactions.length - newTransactions.length;

    if (newTransactions.length === 0) {
      return { importedCount: 0, skippedDuplicatesCount, batchId };
    }

    // 4. Construct bulk values
    const paydayIncomeEventsToInsert: Array<{
      incomeSourceId: string;
      expectedDate: string;
      expectedAmount: string;
      note: string;
      tenantId: string;
      appId: string;
      createdBy: string;
      updatedBy: string;
    }> = [];

    const insertValues = newTransactions.map((t) => {
      let targetCatId = everydayCat.id;
      if (t.targetPool === "REGULAR") {
        targetCatId = regularCat.id;
      } else if (t.targetPool === "GOAL") {
        targetCatId = goalCat.id;
      } else if (t.categoryId && validCatIds.has(t.categoryId)) {
        targetCatId = t.categoryId;
      }

      const recordedAt = t.date ? new Date(t.date) : new Date();

      // If user flagged credit row as Payday Income for waterfall allocation, queue income event creation
      if (t.flowType === "CREDIT" && t.creditAction === "PAYDAY_ALLOCATION" && primaryIncomeSource) {
        paydayIncomeEventsToInsert.push({
          incomeSourceId: primaryIncomeSource.id,
          expectedDate: t.date,
          expectedAmount: t.amount,
          note: t.note || t.description,
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        });
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

    // 5. Bulk insert ledger entries in chunks of 200
    for (let i = 0; i < insertValues.length; i += CHUNK_SIZE) {
      const valueChunk = insertValues.slice(i, i + CHUNK_SIZE);
      await tx.insert(transactionLedger).values(valueChunk);
    }

    // 6. Bulk insert queued payday income events if any
    if (paydayIncomeEventsToInsert.length > 0) {
      for (let i = 0; i < paydayIncomeEventsToInsert.length; i += CHUNK_SIZE) {
        const eventChunk = paydayIncomeEventsToInsert.slice(i, i + CHUNK_SIZE);
        await tx.insert(incomeEvents).values(eventChunk);
      }
    }

    return {
      importedCount: insertValues.length,
      skippedDuplicatesCount,
      batchId,
    };
  });
}
