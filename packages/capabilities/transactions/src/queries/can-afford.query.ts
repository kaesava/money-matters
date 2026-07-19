import { db, categories, transactionLedger, categorySchedules, incomeEvents } from "@money-matters/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { CanAffordVerdictType } from "@money-matters/types";

export async function canAffordQuery(
  amount: number,
  tenantId: string,
  appId: string,
  dbClient: PgDatabase<any, any, any> = db
): Promise<CanAffordVerdictType> {
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

  // 4. Calculate Everyday Pool Total
  let everydayBalance = 0;
  for (const cat of dbCats) {
    if (cat.type === "EVERYDAY") {
      everydayBalance += balancesMap[cat.id] || 0;
    }
  }

  // 5. Verdict Type A: YES
  if (amount <= everydayBalance) {
    return {
      verdict: "YES",
      source: "everyday",
      everydayRemaining: (everydayBalance - amount).toFixed(2),
    };
  }

  // 6. Verdict Type B: YES_WITH_IMPACT (dips into uncommitted savings surplus)
  // Let's check savings buckets that have excess surplus (balance > prorated target)
  const today = new Date();
  let bestSavingsId = "";
  let bestSavingsName = "";
  let bestSavingsSurplus = 0;

  for (const cat of dbCats) {
    if (cat.type === "SAVINGS" && !cat.isCommitted) {
      const sched = schedulesMap.get(cat.id);
      const balance = balancesMap[cat.id] || 0;
      if (sched) {
        const target = parseFloat(sched.targetAmount || "0");
        let monthsRemaining = 12;
        if (sched.targetDate) {
          const targetD = new Date(sched.targetDate);
          const diffDays = (targetD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
          monthsRemaining = Math.max(1, Math.ceil(diffDays / 30.4375));
        }
        
        // Target prorated current accumulated goal
        // Let's assume simple linear accumulation target based on due date proximity (12 months or targetDate)
        // If balance exceeds prorated targets, that is uncommitted surplus
        const surplus = Math.max(0, balance);
        if (surplus > bestSavingsSurplus) {
          bestSavingsSurplus = surplus;
          bestSavingsId = cat.id;
          bestSavingsName = cat.name;
        }
      }
    }
  }

  if (amount <= everydayBalance + bestSavingsSurplus && bestSavingsSurplus > 0) {
    const fromSavingsNeeded = amount - everydayBalance;
    return {
      verdict: "YES_WITH_IMPACT",
      source: "savings",
      affectedBucketId: bestSavingsId,
      affectedBucketName: bestSavingsName,
      newBalance: ((balancesMap[bestSavingsId] || 0) - fromSavingsNeeded).toFixed(2),
    };
  }

  // 7. Verdict Type C: WAIT (check if paycheck is arriving in next 14 days and would cover the gap)
  const upcomingPaychecks = await dbClient
    .select()
    .from(incomeEvents)
    .where(
      and(
        eq(incomeEvents.tenantId, tenantId),
        eq(incomeEvents.appId, appId),
        eq(incomeEvents.status, "UPCOMING"),
        sql`${incomeEvents.archivedAt} IS NULL`
      )
    )
    .orderBy(desc(incomeEvents.expectedDate));

  const nextPaycheck = upcomingPaychecks[upcomingPaychecks.length - 1]; // closest
  if (nextPaycheck) {
    const paycheckDate = new Date(nextPaycheck.expectedDate);
    const diffDays = Math.ceil((paycheckDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const paycheckAmount = parseFloat(nextPaycheck.expectedAmount);
    
    if (diffDays <= 14 && (everydayBalance + paycheckAmount) >= amount) {
      return {
        verdict: "WAIT",
        daysUntilNextPaycheck: Math.max(1, diffDays),
        amountExpected: paycheckAmount.toFixed(2),
      };
    }
  }

  // 8. Verdict Type D: NO
  const shortfall = amount - everydayBalance;
  return {
    verdict: "NO",
    shortfall: shortfall.toFixed(2),
  };
}
