import { pools, expenseEvents, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";

export async function archivePoolCommand(
  poolId: string,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  const [pool] = await dbClient
    .select()
    .from(pools)
    .where(
      and(
        eq(pools.id, poolId),
        eq(pools.tenantId, tenantId),
        eq(pools.appId, appId)
      )
    );

  if (!pool) throw new Error("Pool not found.");
  if (pool.poolType === "EVERYDAY") {
    throw new Error("The default Everyday pool cannot be deleted or archived.");
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
        eq(expenseEvents.status, "UPCOMING"),
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );

  if (pendingEvents.length > 0) {
    throw new Error("Cannot archive a pool that has upcoming expenses assigned to it.");
  }

  const [archived] = await dbClient
    .update(pools)
    .set({
      archivedAt: new Date(),
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

  return archived;
}
