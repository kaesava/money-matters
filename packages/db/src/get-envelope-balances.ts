import { DbOrTx } from "./types.js";
import { transactionLedger } from "./schema/transaction_ledger.js";
import { and, eq, sql } from "drizzle-orm";

/**
 * Computes net balances per envelope using DB-side aggregate SUM(CASE WHEN flowType='CREDIT' ...).
 * Replaces O(N) full ledger fetches with a single grouped DB query.
 */
export async function getEnvelopeBalancesMap(
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
): Promise<Record<string, number>> {
  const query = dbClient
    .select({
      envelopeId: transactionLedger.envelopeId,
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

  type BalanceRow = {
    envelopeId?: string | null;
    balance?: string;
    amount?: string;
    flowType?: string;
  };
  type GroupableQuery = PromiseLike<BalanceRow[]> & {
    groupBy?: (col: unknown) => Promise<BalanceRow[]>;
  };

  const groupableQuery = query as unknown as GroupableQuery;
  const rows = typeof groupableQuery.groupBy === "function"
    ? await groupableQuery.groupBy(transactionLedger.envelopeId)
    : await groupableQuery;

  const balancesMap: Record<string, number> = {};
  for (const r of (rows || [])) {
    if (r && r.envelopeId) {
      if (r.balance !== undefined) {
        const val = parseFloat(r.balance || "0");
        balancesMap[r.envelopeId] = (balancesMap[r.envelopeId] || 0) + (isNaN(val) ? 0 : val);
      } else if (r.amount !== undefined) {
        const val = parseFloat(r.amount);
        const signed = r.flowType === "CREDIT" ? val : -val;
        balancesMap[r.envelopeId] = (balancesMap[r.envelopeId] || 0) + (isNaN(signed) ? 0 : signed);
      }
    }
  }
  return balancesMap;
}
