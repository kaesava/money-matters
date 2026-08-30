import { pools, transactionLedger, getPoolBalancesMap, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";


export async function getMonthlySummaryQuery(
  year: number,
  month: number,
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
) {
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

  const dbPools = await dbClient
    .select({
      id: pools.id,
      poolType: pools.poolType,
    })
    .from(pools)
    .where(
      and(
        eq(pools.tenantId, tenantId),
        eq(pools.appId, appId),
        sql`${pools.archivedAt} IS NULL`
      )
    );

  const poolMap = new Map(dbPools.map((p) => [p.id, p.poolType]));

  // 1. Fetch pre-aggregated pool balances (single query)
  const balancesMap = await getPoolBalancesMap(tenantId, appId, dbClient);

  let everydayRemaining = 0;
  let billsRemaining = 0;

  for (const pool of dbPools) {
    const bal = balancesMap[pool.id] || 0;
    if (pool.poolType === "EVERYDAY") {
      everydayRemaining += bal;
    } else if (pool.poolType === "REGULAR") {
      billsRemaining += bal;
    }
  }

  // 2. Fetch month-filtered transactions for month's totalIncome, totalSpent, totalSaved
  const txs = await dbClient
    .select({
      flowType: transactionLedger.flowType,
      amount: transactionLedger.amount,
      poolId: transactionLedger.poolId,
    })
    .from(transactionLedger)
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        sql`${transactionLedger.recordedAt} >= ${startDate.toISOString()}::timestamptz`,
        sql`${transactionLedger.recordedAt} < ${endDate.toISOString()}::timestamptz`,
        sql`${transactionLedger.archivedAt} IS NULL`
      )
    );

  let totalIncome = 0;
  let totalSpent = 0;
  let totalSaved = 0;

  for (const tx of txs) {
    if (!tx.poolId) continue;
    const val = parseFloat(tx.amount);
    const poolType = poolMap.get(tx.poolId);
    
    if (tx.flowType === "CREDIT") {
      totalIncome += val;
      if (poolType === "GOAL") {
        totalSaved += val;
      }
    } else {
      totalSpent += val;
    }
  }

  return {
    year,
    month,
    totalIncome: totalIncome.toFixed(2),
    totalSpent: totalSpent.toFixed(2),
    totalSaved: totalSaved.toFixed(2),
    everydayRemaining: everydayRemaining.toFixed(2),
    billsRemaining: billsRemaining.toFixed(2),
  };
}

