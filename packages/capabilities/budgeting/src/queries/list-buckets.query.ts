import { db, categories, categorySchedules, transactionLedger } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";

export async function listBucketsQuery(
  tenantId: string,
  appId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  // 1. Fetch categories
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

  // 2. Fetch category schedules
  const dbSchedules = await dbClient
    .select()
    .from(categorySchedules)
    .where(
      and(
        eq(categorySchedules.tenantId, tenantId),
        eq(categorySchedules.appId, appId),
        sql`${categorySchedules.archivedAt} IS NULL`
      )
    );

  const schedulesMap = new Map(dbSchedules.map((s) => [s.categoryId, s]));

  // 3. Compute balances from ledger credits and debits
  const txs = await dbClient
    .select({
      categoryId: transactionLedger.categoryId,
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

  const balancesMap: Record<string, number> = {};
  for (const cat of dbCats) {
    balancesMap[cat.id] = 0;
  }
  for (const tx of txs) {
    const val = parseFloat(tx.amount);
    if (tx.flowType === "CREDIT") {
      balancesMap[tx.categoryId] = (balancesMap[tx.categoryId] || 0) + val;
    } else {
      balancesMap[tx.categoryId] = (balancesMap[tx.categoryId] || 0) - val;
    }
  }

  // 4. Determine health status and progress
  const today = new Date();
  return dbCats.map((cat) => {
    const balance = balancesMap[cat.id] || 0;
    const sched = schedulesMap.get(cat.id);
    let health: "GREEN" | "AMBER" | "RED" = "GREEN";
    let progressPct = 100;

    if (cat.type === "REGULAR") {
      const monthlyAmount = cat.monthlyAmount ? parseFloat(cat.monthlyAmount) : 0;
      progressPct = monthlyAmount > 0 ? Math.min(100, Math.round((balance / monthlyAmount) * 100)) : 100;
      if (balance <= 0) {
        health = "RED";
      } else if (balance < monthlyAmount) {
        health = "AMBER";
      }
    } else if (cat.type === "SAVINGS" && sched) {
      const targetAmount = parseFloat(sched.targetAmount || "0");
      progressPct = targetAmount > 0 ? Math.min(100, Math.round((balance / targetAmount) * 100)) : 100;
      if (balance <= 0) {
        health = "RED";
      } else if (sched.targetDate) {
        const targetD = new Date(sched.targetDate);
        if (targetD.getTime() < today.getTime() && balance < targetAmount) {
          health = "RED";
        } else if (balance < targetAmount * 0.5) {
          health = "AMBER";
        }
      }
    } else {
      // EVERYDAY
      health = balance >= 0 ? "GREEN" : "RED";
    }

    return {
      id: cat.id,
      name: cat.name,
      type: cat.type,
      isCommitted: cat.isCommitted,
      isDefaultExcess: cat.isDefaultExcess,
      monthlyAmount: cat.monthlyAmount || null,
      icon: cat.icon || null,
      colour: cat.colour || null,
      bankAccountId: cat.bankAccountId || null,
      currentBalance: balance.toFixed(2),
      targetAmount: sched?.targetAmount || null,
      targetDate: sched?.targetDate || null,
      progressPercentage: progressPct,
      healthStatus: health,
    };
  });
}
