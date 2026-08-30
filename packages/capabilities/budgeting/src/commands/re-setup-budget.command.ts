import { z } from "zod";
import { eq, and, isNull, count, inArray } from "drizzle-orm";
import { pools, categories, transactionLedger, bankAccounts, DbOrTx } from "@money-matters/db";
import { ReSetupBudgetInputSchema } from "@money-matters/types";

const DEFAULT_APP_ID = "01908bde-34bb-7b19-a178-574211bc93aa";

export type ReSetupBudgetInput = z.infer<typeof ReSetupBudgetInputSchema>;

/**
 * Re-Setup Budget Command Handler
 * 
 * Preservatively adjusts household pools and sub-tag categories:
 * - Soft-archives pools/categories removed during setup if they contain >= 1 historical transactions.
 * - Hard-deletes pools/categories removed during setup if they contain 0 transactions.
 * - Preserves historical transaction_ledger integrity.
 */
export async function reSetupBudget(
  db: DbOrTx,
  input: ReSetupBudgetInput,
  overrideTenantId?: string,
  overrideUserId?: string,
  overrideAppId?: string
): Promise<{ status: "SUCCESS"; updatedCount: number; archivedCount: number }> {
  const parsed = ReSetupBudgetInputSchema.parse(input);

  const tenantId = overrideTenantId || parsed.tenantId;
  const userId = overrideUserId || parsed.userId || "system";
  const appId = overrideAppId || DEFAULT_APP_ID;

  if (!tenantId) {
    throw new Error("Tenant ID is required for reSetupBudget command.");
  }

  // Fetch primary bank account to fallback if bankAccountId is omitted on pool
  const [primaryAccount] = await db
    .select({ id: bankAccounts.id })
    .from(bankAccounts)
    .where(and(eq(bankAccounts.tenantId, tenantId), isNull(bankAccounts.archivedAt)))
    .limit(1);

  const defaultBankAccountId = primaryAccount?.id || "00000000-0000-0000-0000-000000000001";

  // Fetch current active pools for tenant
  const existingPools = await db
    .select({ id: pools.id, name: pools.name })
    .from(pools)
    .where(and(eq(pools.tenantId, tenantId), isNull(pools.archivedAt)));

  // Fetch current active categories for tenant
  const existingCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.tenantId, tenantId), isNull(categories.archivedAt)));

  let updatedCount = 0;
  let archivedCount = 0;

  const incomingPoolIds = new Set<string>();
  const incomingCatIds = new Set<string>();

  for (const poolItem of parsed.poolsList) {
    let poolId = poolItem.id;
    const targetBankAccountId = poolItem.bankAccountId || defaultBankAccountId;

    if (poolId) {
      incomingPoolIds.add(poolId);
      await db
        .update(pools)
        .set({
          name: poolItem.name,
          poolType: poolItem.poolType,
          bankAccountId: targetBankAccountId,
          everydayAllowanceAmount: poolItem.everydayAllowanceAmount || null,
          targetAmount: poolItem.targetAmount || null,
          targetDate: poolItem.targetDate || null,
          isCommitted: poolItem.isCommitted ?? false,
          isSurplusTarget: poolItem.isSurplusTarget ?? false,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(and(eq(pools.id, poolId), eq(pools.tenantId, tenantId)));
      updatedCount++;
    } else {
      const [insertedPool] = await db
        .insert(pools)
        .values({
          tenantId,
          appId,
          name: poolItem.name,
          poolType: poolItem.poolType,
          bankAccountId: targetBankAccountId,
          everydayAllowanceAmount: poolItem.everydayAllowanceAmount || null,
          targetAmount: poolItem.targetAmount || null,
          targetDate: poolItem.targetDate || null,
          isCommitted: poolItem.isCommitted ?? false,
          isSurplusTarget: poolItem.isSurplusTarget ?? false,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();
      poolId = insertedPool.id;
      updatedCount++;
    }

    // Process nested categories for this pool
    for (const catItem of poolItem.categories) {
      if (catItem.id) {
        incomingCatIds.add(catItem.id);
        await db
          .update(categories)
          .set({
            name: catItem.name,
            poolId,
            monthlyAmount: catItem.monthlyAmount || null,
            isEssential: catItem.isEssential ?? false,
            icon: catItem.icon || null,
            colour: catItem.colour || null,
            updatedAt: new Date(),
            updatedBy: userId,
          })
          .where(and(eq(categories.id, catItem.id), eq(categories.tenantId, tenantId)));
        updatedCount++;
      } else {
        await db.insert(categories).values({
          tenantId,
          appId,
          poolId,
          name: catItem.name,
          monthlyAmount: catItem.monthlyAmount || null,
          isEssential: catItem.isEssential ?? false,
          icon: catItem.icon || null,
          colour: catItem.colour || null,
          createdBy: userId,
          updatedBy: userId,
        });
        updatedCount++;
      }
    }
  }

  // Handle removed categories
  const removedCatIds = existingCategories.map((c) => c.id).filter((id) => !incomingCatIds.has(id));
  if (removedCatIds.length > 0) {
    const txCounts = await db
      .select({ categoryId: transactionLedger.categoryId, value: count() })
      .from(transactionLedger)
      .where(and(inArray(transactionLedger.categoryId, removedCatIds), eq(transactionLedger.tenantId, tenantId)))
      .groupBy(transactionLedger.categoryId);

    const txMap = new Map(txCounts.map((r) => [r.categoryId, r.value ?? 0]));

    const softArchiveCats = removedCatIds.filter((id) => ((txMap.get(id) ?? 0) as number) > 0);
    const hardDeleteCats = removedCatIds.filter((id) => ((txMap.get(id) ?? 0) as number) === 0);

    if (softArchiveCats.length > 0) {
      await db
        .update(categories)
        .set({ archivedAt: new Date(), archivedBy: userId })
        .where(and(inArray(categories.id, softArchiveCats), eq(categories.tenantId, tenantId)));
      archivedCount += softArchiveCats.length;
    }
    if (hardDeleteCats.length > 0) {
      await db.delete(categories).where(and(inArray(categories.id, hardDeleteCats), eq(categories.tenantId, tenantId)));
      archivedCount += hardDeleteCats.length;
    }
  }

  // Handle removed pools
  const removedPoolIds = existingPools.map((p) => p.id).filter((id) => !incomingPoolIds.has(id));
  if (removedPoolIds.length > 0) {
    const txCounts = await db
      .select({ poolId: transactionLedger.poolId, value: count() })
      .from(transactionLedger)
      .where(and(inArray(transactionLedger.poolId, removedPoolIds), eq(transactionLedger.tenantId, tenantId)))
      .groupBy(transactionLedger.poolId);

    const txMap = new Map(txCounts.map((r) => [r.poolId, r.value ?? 0]));

    const softArchivePools = removedPoolIds.filter((id) => ((txMap.get(id) ?? 0) as number) > 0);
    const hardDeletePools = removedPoolIds.filter((id) => ((txMap.get(id) ?? 0) as number) === 0);

    if (softArchivePools.length > 0) {
      await db
        .update(pools)
        .set({ archivedAt: new Date(), archivedBy: userId })
        .where(and(inArray(pools.id, softArchivePools), eq(pools.tenantId, tenantId)));
      archivedCount += softArchivePools.length;
    }
    if (hardDeletePools.length > 0) {
      await db.delete(pools).where(and(inArray(pools.id, hardDeletePools), eq(pools.tenantId, tenantId)));
      archivedCount += hardDeletePools.length;
    }
  }

  return { status: "SUCCESS", updatedCount, archivedCount };
}
