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
  dbClient: PgDatabase<any, any, any> = db,
  customLines?: { bucketId: string; amount: string }[],
  markAsReceivedToday?: boolean
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

  let freqDays = 14;
  if (event) {
    const [source] = await dbClient
      .select()
      .from(incomeSources)
      .where(eq(incomeSources.id, event.incomeSourceId));
    if (source) {
      const expectedAmount = parseFloat(source.amount);
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const eventDateStr = event ? new Date(event.expectedDate).toISOString().slice(0, 10) : todayStr;
  const isFuturePlanned = eventDateStr > todayStr && !markAsReceivedToday;

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

  const customLinesMap = customLines
    ? new Map(customLines.map((l) => [l.bucketId, parseFloat(l.amount)]))
    : null;

  // 5. Execute DB write transaction
  const plan = await dbClient.transaction(async (tx) => {
    const [insertedPlan] = await tx
      .insert(allocationPlans)
      .values({
        tenantId,
        appId,
        incomeEventId,
        status: isFuturePlanned ? "PENDING" : "CONFIRMED",
        totalIncomeAmount: incomeAmount.toFixed(2),
        confirmedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    for (const line of engineOutput.lines) {
      const confirmedVal = customLinesMap?.has(line.bucketId)
        ? customLinesMap.get(line.bucketId)!
        : line.proposedAmount;

      const [insertedLine] = await tx
        .insert(allocationPlanLines)
        .values({
          tenantId,
          appId,
          planId: insertedPlan.id,
          categoryId: line.bucketId,
          proposedAmount: line.proposedAmount.toFixed(2),
          confirmedAmount: confirmedVal.toFixed(2),
          reasoning: line.reasoning,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      // Issue credit entry in ledger ONLY if not future planned and confirmedVal > 0
      if (!isFuturePlanned && confirmedVal > 0) {
        const isCustomized = customLinesMap?.has(line.bucketId) && Math.abs(customLinesMap.get(line.bucketId)! - line.proposedAmount) >= 0.01;
        await tx.insert(transactionLedger).values({
          tenantId,
          appId,
          categoryId: line.bucketId,
          planLineId: insertedLine.id,
          flowType: "CREDIT",
          amount: confirmedVal.toFixed(2),
          idempotencyKey: `paydayalloc-${insertedLine.id}`,
          note: `Payday Allocation: ${line.reasoning}`,
          source: isCustomized ? "MANUAL" : "AUTO",
          createdBy: userId,
          updatedBy: userId,
        });
      }
    }

    if (!isFuturePlanned) {
      // Update income event status to CONFIRMED
      const updateData: Record<string, any> = {
        status: "CONFIRMED",
        actualAmount: incomeAmount.toFixed(2),
        updatedBy: userId,
        updatedAt: new Date(),
      };
      if (markAsReceivedToday && event) {
        updateData.expectedDate = new Date();
      }
      await tx
        .update(incomeEvents)
        .set(updateData)
        .where(eq(incomeEvents.id, incomeEventId));
    }

    return { ...insertedPlan, isFuturePlanned };
  });

  return plan;
}
