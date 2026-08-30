import { pools, categories, transactionLedger, incomeEvents, incomeSources, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { runAllocationEngine, EngineBucket } from "../engine/allocation-engine.js";
import { parseRruleFrequencyDays } from "../commands/run-allocation.command.js";

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
  for (const cat of dbCats) {
    if (cat.monthlyAmount) {
      const val = parseFloat(cat.monthlyAmount);
      poolCategoryTargetsMap.set(cat.poolId, (poolCategoryTargetsMap.get(cat.poolId) || 0) + val);
    }
  }

  // 3. Compute balances from ledger per poolId
  const txs = await dbClient
    .select({
      poolId: transactionLedger.poolId,
      amount: transactionLedger.amount,
      flowType: transactionLedger.flowType,
    })
    .from(transactionLedger)
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        sql`${transactionLedger.archivedAt} IS NULL`
      )
    );

  const poolBalancesMap: Record<string, number> = {};
  for (const pool of dbPools) {
    poolBalancesMap[pool.id] = 0;
  }
  for (const tx of txs) {
    if (!tx.poolId) continue;
    const val = parseFloat(tx.amount);
    if (tx.flowType === "CREDIT") {
      poolBalancesMap[tx.poolId] = (poolBalancesMap[tx.poolId] || 0) + val;
    } else {
      poolBalancesMap[tx.poolId] = (poolBalancesMap[tx.poolId] || 0) - val;
    }
  }

  // 4. Fetch income event to resolve dates & recurrence
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


  const engineBuckets: EngineBucket[] = dbPools.map((pool) => {
    const balance = poolBalancesMap[pool.id] || 0;
    const catTargetSum = poolCategoryTargetsMap.get(pool.id) || 0;

    const monthlyAmt = pool.poolType === "REGULAR" 
      ? (catTargetSum > 0 ? catTargetSum : (pool.targetAmount ? parseFloat(pool.targetAmount) : null))
      : (pool.targetAmount ? parseFloat(pool.targetAmount) : null);

    return {
      id: pool.id,
      name: pool.name,
      type: pool.poolType,
      isCommitted: pool.isCommitted,
      isSurplusTarget: pool.isSurplusTarget,
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
    paycheckDate: event ? new Date(event.expectedDate) : new Date(),
    paycheckFrequencyDays: freqDays,
  });

  return engineOutput.lines.map((line) => {
    const pool = dbPools.find((p) => p.id === line.bucketId);
    const balance = poolBalancesMap[line.bucketId] || 0;
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
