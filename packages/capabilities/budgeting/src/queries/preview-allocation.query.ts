import { db, categories, categorySchedules, transactionLedger, incomeEvents, incomeSources } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { runAllocationEngine, EngineBucket } from "../engine/allocation-engine.js";

export async function previewAllocationQuery(
  tenantId: string,
  appId: string,
  incomeEventId: string,
  incomeAmount: number,
  dbClient: PgDatabase<any, any, any> = db
) {
  // 1. Fetch Categories
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

  // 2. Fetch Category Schedules
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

  // 3. Compute balances from ledger
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

  // 4. Fetch income event to resolve dates
  const [event] = await dbClient
    .select()
    .from(incomeEvents)
    .where(eq(incomeEvents.id, incomeEventId));

  let freqDays = 14;

  const engineBuckets: EngineBucket[] = dbCats.map((cat) => {
    const sched = schedulesMap.get(cat.id);
    const balance = balancesMap[cat.id] || 0;
    return {
      id: cat.id,
      name: cat.name,
      type: cat.type as any,
      isCommitted: cat.isCommitted,
      isDefaultExcess: cat.isDefaultExcess,
      monthlyAmount: cat.monthlyAmount ? parseFloat(cat.monthlyAmount) : null,
      targetAmount: sched?.targetAmount ? parseFloat(sched.targetAmount) : null,
      targetDate: sched?.targetDate || null,
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
    const cat = dbCats.find((c) => c.id === line.bucketId);
    const sched = schedulesMap.get(line.bucketId);
    const balance = balancesMap[line.bucketId] || 0;
    const target = sched?.targetAmount ? parseFloat(sched.targetAmount) : null;
    const progress = target && target > 0 ? Math.min(100, Math.round((balance / target) * 100)) : 0;

    return {
      categoryId: line.bucketId,
      categoryName: line.bucketName,
      type: cat?.type || "REGULAR",
      currentBalance: balance.toFixed(2),
      targetAmount: target ? target.toFixed(2) : null,
      progressPercentage: progress,
      proposedAmount: line.proposedAmount,
      reasoning: line.reasoning,
    };
  });
}
