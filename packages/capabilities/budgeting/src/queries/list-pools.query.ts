import { pools, bankAccounts, DbOrTx, getPoolBalancesMap } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";

export async function listPoolsQuery(
  tenantId: string,
  appId: string,
  dbClient: DbOrTx,
  userId?: string
) {
  // 1. Fetch pools joined with bankAccounts for stealth privacy
  const poolFilters = [
    eq(pools.tenantId, tenantId),
    eq(pools.appId, appId),
    sql`${pools.archivedAt} IS NULL`,
  ];

  const dbPools = await dbClient
    .select({
      id: pools.id,
      name: pools.name,
      poolType: pools.poolType,
      bankAccountId: pools.bankAccountId,
      everydayAllowanceAmount: pools.everydayAllowanceAmount,
      rolloverRule: pools.rolloverRule,
      targetAmount: pools.targetAmount,
      targetDate: pools.targetDate,
      isCommitted: pools.isCommitted,
      isSurplusTarget: pools.isSurplusTarget,
      waterfallPriority: pools.waterfallPriority,
      isPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(pools)
    .innerJoin(bankAccounts, eq(pools.bankAccountId, bankAccounts.id))
    .where(and(...poolFilters));

  const visiblePools = userId
    ? dbPools.filter((p) => !p.isPrivate || p.bankAccountUserId === userId)
    : dbPools;

  // 2. Compute balances using DB-side aggregate SUM(CASE WHEN...)
  const balancesMap = await getPoolBalancesMap(tenantId, appId, dbClient);

  // 3. Determine health status & progress percentage
  const today = new Date();

  return visiblePools.map((pool) => {
    const currentBalance = balancesMap[pool.id] || 0;
    let healthStatus: "GREEN" | "AMBER" | "RED" = "GREEN";
    let progressPercentage = 100;

    if (currentBalance < 0) {
      healthStatus = "RED";
    } else if (pool.poolType === "GOAL") {
      const target = pool.targetAmount ? parseFloat(pool.targetAmount) : 0;
      progressPercentage = target > 0 ? Math.min(100, Math.round((currentBalance / target) * 100)) : 100;
      if (pool.targetDate) {
        const targetD = new Date(pool.targetDate + "T00:00:00+10:00").getTime();
        if (today.getTime() > targetD && currentBalance < target) {
          healthStatus = "RED";
        } else if (progressPercentage < 50) {
          healthStatus = "AMBER";
        }
      }
    } else if (pool.poolType === "REGULAR") {
      const target = pool.targetAmount ? parseFloat(pool.targetAmount) : 0;
      progressPercentage = target > 0 ? Math.min(100, Math.round((currentBalance / target) * 100)) : 100;
      if (target > 0 && currentBalance < target) {
        healthStatus = currentBalance < target * 0.8 ? "RED" : "AMBER";
      }
    } else if (pool.poolType === "EVERYDAY") {
      healthStatus = currentBalance >= 0 ? "GREEN" : "RED";
    }

    return {
      id: pool.id,
      name: pool.name,
      poolType: pool.poolType,
      bankAccountId: pool.bankAccountId,
      everydayAllowanceAmount: pool.everydayAllowanceAmount,
      rolloverRule: pool.rolloverRule,
      targetAmount: pool.targetAmount,
      targetDate: pool.targetDate,
      isCommitted: pool.isCommitted,
      isSurplusTarget: pool.isSurplusTarget,
      waterfallPriority: pool.waterfallPriority,
      isPrivate: pool.isPrivate,
      currentBalance,
      healthStatus,
      progressPercentage,
    };
  });
}

