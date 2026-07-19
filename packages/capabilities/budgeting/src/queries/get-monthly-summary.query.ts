import { db, categories, transactionLedger } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";

export async function getMonthlySummaryQuery(
  year: number,
  month: number,
  tenantId: string,
  appId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  // Aggregate credits and debits recorded during the given year and month
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

  const txs = await dbClient
    .select({
      flowType: transactionLedger.flowType,
      amount: transactionLedger.amount,
      categoryId: transactionLedger.categoryId,
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

  // Retrieve category info to distinguish savings
  const dbCats = await dbClient
    .select({
      id: categories.id,
      type: categories.type,
    })
    .from(categories)
    .where(
      and(
        eq(categories.tenantId, tenantId),
        eq(categories.appId, appId),
        sql`${categories.archivedAt} IS NULL`
      )
    );

  const catMap = new Map(dbCats.map((c) => [c.id, c.type]));

  for (const tx of txs) {
    const val = parseFloat(tx.amount);
    const catType = catMap.get(tx.categoryId);
    
    if (tx.flowType === "CREDIT") {
      // Income cascade allocations represent income
      totalIncome += val;
      if (catType === "SAVINGS") {
        totalSaved += val;
      }
    } else {
      totalSpent += val;
    }
  }

  // Get current everyday remaining balance (over all time, not just this month)
  const allTxs = await dbClient
    .select({
      flowType: transactionLedger.flowType,
      amount: transactionLedger.amount,
      categoryId: transactionLedger.categoryId,
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
  for (const tx of allTxs) {
    const val = parseFloat(tx.amount);
    const catType = catMap.get(tx.categoryId);
    if (catType === "EVERYDAY") {
      if (tx.flowType === "CREDIT") {
        everydayRemaining += val;
      } else {
        everydayRemaining -= val;
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
  };
}
