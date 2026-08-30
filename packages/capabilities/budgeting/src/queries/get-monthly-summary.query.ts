import { pools, transactionLedger, DbOrTx } from "@money-matters/db";
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

  const allTxs = await dbClient
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
        sql`${transactionLedger.archivedAt} IS NULL`
      )
    );

  let everydayRemaining = 0;
  let billsRemaining = 0;
  for (const tx of allTxs) {
    if (!tx.poolId) continue;
    const val = parseFloat(tx.amount);
    const poolType = poolMap.get(tx.poolId);
    if (poolType === "EVERYDAY") {
      if (tx.flowType === "CREDIT") {
        everydayRemaining += val;
      } else {
        everydayRemaining -= val;
      }
    } else if (poolType === "REGULAR") {
      if (tx.flowType === "CREDIT") {
        billsRemaining += val;
      } else {
        billsRemaining -= val;
      }
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
