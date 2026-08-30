import { transactionLedger, pools, categories, incomeEvents, incomeSources, DbOrTx } from "@money-matters/db";
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
    // 1. Fetch tenant pools & categories
    const tenantPools = await tx
      .select({ id: pools.id, name: pools.name, poolType: pools.poolType })
      .from(pools)
      .where(
        and(
          eq(pools.tenantId, tenantId),
          eq(pools.appId, appId)
        )
      );

    const validPoolIds = new Set(tenantPools.map((p) => p.id));
    const everydayPool = tenantPools.find((p) => p.poolType === "EVERYDAY") || tenantPools[0];
    const regularPool = tenantPools.find((p) => p.poolType === "REGULAR") || everydayPool;
    const goalPool = tenantPools.find((p) => p.poolType === "GOAL") || everydayPool;

    if (!everydayPool) {
      throw new Error("No valid budget pool found for this tenant.");
    }

    const tenantCategories = await tx
      .select({ id: categories.id, poolId: categories.poolId })
      .from(categories)
      .where(
        and(
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId)
        )
      );
    const validCatIds = new Set(tenantCategories.map((c) => c.id));

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
      let targetPoolId = everydayPool.id;

      if (t.poolId && validPoolIds.has(t.poolId)) {
        targetPoolId = t.poolId;
      } else if (t.targetPoolType === "REGULAR") {
        targetPoolId = regularPool.id;
      } else if (t.targetPoolType === "GOAL") {
        targetPoolId = goalPool.id;
      }

      const targetCategoryId = t.categoryId && validCatIds.has(t.categoryId) ? t.categoryId : null;

      // Handle credit payday allocation scheduling
      if (t.flowType === "CREDIT" && t.creditAction === "PAYDAY_ALLOCATION" && primaryIncomeSource) {
        paydayIncomeEventsToInsert.push({
          incomeSourceId: t.incomeSourceId || primaryIncomeSource.id,
          expectedDate: t.date,
          expectedAmount: t.amount,
          note: `Imported Payday Income: ${t.description}`,
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        });
      }

      return {
        tenantId,
        appId,
        poolId: targetPoolId,
        categoryId: targetCategoryId,
        bankAccountId: input.bankAccountId,
        flowType: t.flowType,
        amount: t.amount,
        idempotencyKey: t.idempotencyKey,
        note: t.note || t.description,
        source: "IMPORT" as const,
        transferGroupId: batchId,
        recordedAt: new Date(t.date),
        createdBy: userId,
        updatedBy: userId,
      };
    });

    // 5. Bulk insert in chunks of 200
    for (let i = 0; i < insertValues.length; i += CHUNK_SIZE) {
      const chunk = insertValues.slice(i, i + CHUNK_SIZE);
      await tx.insert(transactionLedger).values(chunk);
    }

    if (paydayIncomeEventsToInsert.length > 0) {
      for (let i = 0; i < paydayIncomeEventsToInsert.length; i += CHUNK_SIZE) {
        const chunk = paydayIncomeEventsToInsert.slice(i, i + CHUNK_SIZE);
        await tx.insert(incomeEvents).values(chunk);
      }
    }

    return {
      importedCount: newTransactions.length,
      skippedDuplicatesCount,
      batchId,
    };
  });
}
