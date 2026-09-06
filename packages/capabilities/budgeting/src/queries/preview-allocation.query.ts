import { pools, categories, incomeEvents, incomeSources, expenseEvents, getPoolBalancesMap, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { runAllocationEngine, EngineBucket, UpcomingExpenseItem } from "../engine/allocation-engine.js";
import { parseRruleFrequencyDays } from "../commands/run-allocation.command.js";
import { getTenantDateString } from "@money-matters/core";

export async function previewAllocationQuery(
  tenantId: string,
  appId: string,
  incomeEventId: string,
  incomeAmount: number,
  dbClient: DbOrTx
) {
  // 1. Fetch Pools
  const dbPools = await dbClient
    .select()
    .from(pools)
    .where(
      and(
        eq(pools.tenantId, tenantId),
        eq(pools.appId, appId),
        sql`${pools.archivedAt} IS NULL`
      )
    );

  // 2. Fetch Categories
  const dbCats = await dbClient
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.tenantId, tenantId),
        eq(categories.appId, appId),
        sql`${categories.archivedAt} IS NULL`
      )
    );

  // Map sub-category monthly amounts to pool
  const poolCategoryTargetsMap = new Map<string, number>();
  const poolIsEssentialMap = new Map<string, boolean>();
  for (const cat of dbCats) {
    if (cat.monthlyAmount) {
      const val = parseFloat(cat.monthlyAmount);
      poolCategoryTargetsMap.set(cat.poolId, (poolCategoryTargetsMap.get(cat.poolId) || 0) + val);
    }
    if (cat.isEssential) {
      poolIsEssentialMap.set(cat.poolId, true);
    }
  }

  // 3. Compute balances using DB-side aggregate SUM(CASE WHEN...)
  const balancesMap = await getPoolBalancesMap(tenantId, appId, dbClient);

  // 4. Fetch income event joined with income source to resolve dates & recurrence
  const [event] = await dbClient
    .select()
    .from(incomeEvents)
    .where(eq(incomeEvents.id, incomeEventId));

  let freqDays = 14;
  if (event && event.incomeSourceId) {
    const [source] = await dbClient
      .select()
      .from(incomeSources)
      .where(eq(incomeSources.id, event.incomeSourceId));
    if (source?.rrule) {
      freqDays = parseRruleFrequencyDays(source.rrule);
    }
  }

  const todayStr = getTenantDateString();
  const eventDateStr = event ? event.expectedDate : todayStr;
  const eventTime = event ? new Date(event.expectedDate + "T00:00:00+10:00").getTime() : Date.now();
  const nextCutoffDateStr = getTenantDateString(new Date(eventTime + freqDays * 24 * 60 * 60 * 1000));

  // 5. Fetch upcoming expenses due before next cycle cutoff for Cashflow Guard parity
  const pendingExpenses = await dbClient
    .select({
      id: expenseEvents.id,
      poolId: expenseEvents.poolId,
      categoryId: expenseEvents.categoryId,
      name: expenseEvents.name,
      amount: expenseEvents.expectedAmount,
      dueDate: expenseEvents.expectedDate,
    })
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        eq(expenseEvents.status, "PENDING"),
        sql`${expenseEvents.expectedDate} <= ${nextCutoffDateStr}`,
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );

  const upcomingExpenses: UpcomingExpenseItem[] = pendingExpenses.map((e) => ({
    id: e.id,
    poolId: e.poolId,
    categoryId: e.categoryId,
    name: e.name || undefined,
    amount: parseFloat(e.amount),
    dueDate: e.dueDate,
  }));

  const engineBuckets: EngineBucket[] = dbPools.map((pool) => {
    const balance = balancesMap[pool.id] || 0;
    const catTargetSum = poolCategoryTargetsMap.get(pool.id) || 0;

    const monthlyAmt = pool.poolType === "REGULAR" 
      ? (catTargetSum > 0 ? catTargetSum : (pool.targetAmount ? parseFloat(pool.targetAmount) : null))
      : (pool.targetAmount ? parseFloat(pool.targetAmount) : null);

    return {
      id: pool.id,
      name: pool.name,
      type: pool.poolType,
      isEssential: poolIsEssentialMap.get(pool.id) ?? false,
      isCommitted: pool.isCommitted,
      isSurplusTarget: pool.isSurplusTarget,
      rolloverRule: pool.rolloverRule,
      monthlyAmount: monthlyAmt,
      targetAmount: pool.targetAmount ? parseFloat(pool.targetAmount) : null,
      everydayAllowanceAmount: pool.everydayAllowanceAmount ? parseFloat(pool.everydayAllowanceAmount) : null,
      targetDate: pool.targetDate || null,
      currentBalance: balance,
    };
  });

  const engineOutput = runAllocationEngine({
    incomeAmount,
    buckets: engineBuckets,
    paycheckDate: event ? new Date(event.expectedDate + "T00:00:00+10:00") : new Date(),
    paycheckFrequencyDays: freqDays,
    upcomingExpenses,
  });

  return engineOutput.lines.map((line) => {
    const pool = dbPools.find((p) => p.id === line.bucketId);
    const balance = balancesMap[line.bucketId] || 0;
    const target = pool?.targetAmount ? parseFloat(pool.targetAmount) : (poolCategoryTargetsMap.get(line.bucketId) || null);
    const progress = target && target > 0 ? Math.min(100, Math.round((balance / target) * 100)) : 0;

    return {
      poolId: line.bucketId,
      poolName: line.bucketName,
      type: pool?.poolType || "REGULAR",
      currentBalance: balance.toFixed(2),
      targetAmount: target ? target.toFixed(2) : null,
      progressPercentage: progress,
      proposedAmount: line.proposedAmount,
      reasoning: line.reasoning,
    };
  });
}
