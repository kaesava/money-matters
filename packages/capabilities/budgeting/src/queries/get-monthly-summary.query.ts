import { envelopes, transactionLedger, getEnvelopeBalancesMap, DbOrTx, tenants } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";

export async function getMonthlySummaryQuery(
  year: number,
  month: number,
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
) {
  const [tenantRecord] = await dbClient
    .select({ timezone: tenants.timezone })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const tenantTz = tenantRecord?.timezone || "Australia/Sydney";

  // Month bounds in tenant's timezone
  const startMonthStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonthNum = month === 12 ? 1 : month + 1;
  const endMonthStr = `${nextMonthYear}-${String(nextMonthNum).padStart(2, "0")}-01`;

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
      transactionType: transactionLedger.transactionType,
      amount: transactionLedger.amount,
      envelopeId: transactionLedger.envelopeId,
    })
    .from(transactionLedger)
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        sql`(${transactionLedger.recordedAt} AT TIME ZONE ${tenantTz}) >= ${startMonthStr}::date`,
        sql`(${transactionLedger.recordedAt} AT TIME ZONE ${tenantTz}) < ${endMonthStr}::date`,
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

    // Count credits as income ONLY if actual external income was split or direct-deposited
    if (tx.flowType === "CREDIT") {
      if (tx.transactionType === "INCOME_SPLIT" || tx.transactionType === "INCOME_DIRECT") {
        totalIncome += val;
      }
      if (envType === "TARGET_GOAL" || envType === "ONGOING_GOAL") {
        totalSaved += val;
      }
    } else if (tx.flowType === "DEBIT") {
      // Count debits as spending ONLY if actual expense, not an internal transfer out
      if (tx.transactionType === "EXPENSE") {
        totalSpent += val;
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
