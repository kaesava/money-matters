import { db, categories, categorySchedules, allocationPlans, allocationPlanLines, transactionLedger, incomeEvents, incomeSources } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { runAllocationEngine, EngineBucket } from "../engine/allocation-engine.js";

export async function runAllocationCommand(
  tenantId: string,
  appId: string,
  userId: string,
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

  // 4. Fetch income event to resolve dates
  const [event] = await dbClient
    .select()
    .from(incomeEvents)
    .where(eq(incomeEvents.id, incomeEventId));

  // Determine pay frequency days (default 14 for fortnightly)
  let freqDays = 14;
  if (event) {
    const [source] = await dbClient
      .select()
      .from(incomeSources)
      .where(eq(incomeSources.id, event.incomeSourceId));
    if (source) {
      // Crude parsing of RRULE intervals
      const expectedAmount = parseFloat(source.amount);
    }
  }

  // Map to engine models
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

  // 5. Execute DB write transaction
  const plan = await dbClient.transaction(async (tx) => {
    const [insertedPlan] = await tx
      .insert(allocationPlans)
      .values({
        tenantId,
        appId,
        incomeEventId,
        status: "CONFIRMED", // Auto-confirmed directly
        totalIncomeAmount: incomeAmount.toFixed(2),
        confirmedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    for (const line of engineOutput.lines) {
      const [insertedLine] = await tx
        .insert(allocationPlanLines)
        .values({
          tenantId,
          appId,
          planId: insertedPlan.id,
          categoryId: line.bucketId,
          proposedAmount: line.proposedAmount.toFixed(2),
          confirmedAmount: line.proposedAmount.toFixed(2),
          reasoning: line.reasoning,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      // If proposed allocation is > 0, issue credit entry in ledger
      if (line.proposedAmount > 0) {
        await tx.insert(transactionLedger).values({
          tenantId,
          appId,
          categoryId: line.bucketId,
          planLineId: insertedLine.id,
          flowType: "CREDIT",
          amount: line.proposedAmount.toFixed(2),
          idempotencyKey: `autoalloc-${insertedLine.id}`,
          note: `Paycheck Cascade Allocation: ${line.reasoning}`,
          source: "MANUAL",
          createdBy: userId,
          updatedBy: userId,
        });
      }
    }

    // Update income event status to CONFIRMED
    await tx
      .update(incomeEvents)
      .set({
        status: "CONFIRMED",
        actualAmount: incomeAmount.toFixed(2),
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(incomeEvents.id, incomeEventId));

    return insertedPlan;
  });

  return plan;
}
