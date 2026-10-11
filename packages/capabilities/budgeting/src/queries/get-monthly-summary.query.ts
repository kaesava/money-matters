import { envelopes, transactionLedger, getEnvelopeBalancesMap, DbOrTx } from "@money-matters/db";
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

  const dbEnvelopes = await dbClient
    .select({
      id: envelopes.id,
      envelopeType: envelopes.envelopeType,
    })
    .from(envelopes)
    .where(
      and(
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        sql`${envelopes.archivedAt} IS NULL`
      )
    );

  const envMap = new Map(dbEnvelopes.map((e) => [e.id, e.envelopeType]));
  const balancesMap = await getEnvelopeBalancesMap(tenantId, appId, dbClient);

  let everydayRemaining = 0;
  let billsRemaining = 0;

  for (const env of dbEnvelopes) {
    const bal = balancesMap[env.id] || 0;
    if (env.envelopeType === "EVERYDAY") {
      everydayRemaining += bal;
    } else if (env.envelopeType === "SCHEDULED_BILL" || env.envelopeType === "FLEXIBLE_BILL") {
      billsRemaining += bal;
    }
  }

  const txs = await dbClient
    .select({
      flowType: transactionLedger.flowType,
      amount: transactionLedger.amount,
      envelopeId: transactionLedger.envelopeId,
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
    if (!tx.envelopeId) continue;
    const val = parseFloat(tx.amount);
    const envType = envMap.get(tx.envelopeId);

    if (tx.flowType === "CREDIT") {
      totalIncome += val;
      if (envType === "TARGET_GOAL" || envType === "ONGOING_GOAL") {
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
