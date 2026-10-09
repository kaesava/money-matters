import { pools, categories, expenseEvents, bankAccounts, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";

export async function archivePoolCommand(
  poolId: string,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  const [pool] = await dbClient
    .select({
      id: pools.id,
      poolType: pools.poolType,
      isSurplusTarget: pools.isSurplusTarget,
      isPrivate: bankAccounts.isPrivate,
    })
    .from(pools)
    .innerJoin(bankAccounts, eq(pools.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(pools.id, poolId),
        eq(pools.tenantId, tenantId),
        eq(pools.appId, appId)
      )
    );

  if (!pool) throw new Error("Pool not found.");
  if (pool.poolType === "EVERYDAY" && !pool.isPrivate) {
    throw new Error("The shared Everyday pool cannot be deleted or archived.");
  }
  if (pool.poolType === "REGULAR" && !pool.isPrivate) {
    throw new Error("The shared Bills pool cannot be deleted or archived.");
  }
  if (pool.isSurplusTarget) {
    throw new Error("Cannot archive the designated Surplus Target pool. Please designate another Surplus Target pool first.");
  }

  const pendingEvents = await dbClient
    .select()
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.poolId, poolId),
        sql`${expenseEvents.status} IN ('PENDING', 'PENDING')`,
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );

  if (pendingEvents.length > 0) {
    throw new Error("Cannot archive a pool that has upcoming or pending expenses assigned to it.");
  }


  const [archived] = await dbClient
    .update(pools)
    .set({
      archivedAt: new Date(),
      archivedBy: userId,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(pools.id, poolId),
        eq(pools.tenantId, tenantId),
        eq(pools.appId, appId)
      )
    )
    .returning();

  if (archived) {
    await dbClient
      .update(categories)
      .set({
        archivedAt: new Date(),
        archivedBy: userId,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(categories.poolId, poolId),
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId),
          sql`${categories.archivedAt} IS NULL`
        )
      );
  }

  return archived;
}

