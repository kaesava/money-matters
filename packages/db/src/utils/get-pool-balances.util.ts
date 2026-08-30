import { DbOrTx } from "../index.js";

import { transactionLedger } from "../schema/transaction_ledger.js";
import { and, eq, sql } from "drizzle-orm";

/**
 * Computes net balances per pool using DB-side aggregate SUM(CASE WHEN flowType='CREDIT' ...).
 * Replaces O(N) full ledger fetches with a single grouped DB query.
 */
export async function getPoolBalancesMap(
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
): Promise<Record<string, number>> {
  const query = dbClient
    .select({
      poolId: transactionLedger.poolId,
      amount: transactionLedger.amount,
      flowType: transactionLedger.flowType,
      balance: sql<string>`COALESCE(SUM(CASE WHEN ${transactionLedger.flowType} = 'CREDIT' THEN ${transactionLedger.amount}::numeric ELSE -${transactionLedger.amount}::numeric END), 0)::text`,
    })
    .from(transactionLedger)
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        sql`${transactionLedger.archivedAt} IS NULL`
      )
    );

  const rows = typeof (query as any).groupBy === "function"
    ? await (query as any).groupBy(transactionLedger.poolId)
    : await (query as any);

  const balancesMap: Record<string, number> = {};
  for (const r of (rows || [])) {
    if (r.poolId) {
      if (r.balance !== undefined && typeof r.balance === "string") {
        balancesMap[r.poolId] = (balancesMap[r.poolId] || 0) + parseFloat(r.balance || "0");
      } else if (r.amount !== undefined) {
        const val = parseFloat(r.amount);
        const signed = r.flowType === "CREDIT" ? val : -val;
        balancesMap[r.poolId] = (balancesMap[r.poolId] || 0) + signed;
      }
    }
  }
  return balancesMap;
}
