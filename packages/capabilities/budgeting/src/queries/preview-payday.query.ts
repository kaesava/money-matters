import { db, incomeEvents, categories, categorySchedules, transactionLedger } from "@money-matters/db";
import { eq, and, sql, asc } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { runAllocationEngine, EngineBucket } from "../engine/allocation-engine.js";

export async function previewPaydayQuery(
  incomeEventId: string,
  tenantId: string,
  appId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  // 1. Get all active upcoming income events sorted by date
  const upcomingEvents = await dbClient
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
    .orderBy(asc(incomeEvents.expectedDate));

  if (upcomingEvents.length === 0) {
    throw new Error("No upcoming income events found.");
  }

  const nextImmediateEvent = upcomingEvents[0];
  const targetEvent = upcomingEvents.find((e) => e.id === incomeEventId);

  if (!targetEvent) {
    throw new Error("Target income event not found or not in UPCOMING status.");
  }

  // Enforce Payday Scope: Target event MUST be the next immediate upcoming income event
  if (targetEvent.id !== nextImmediateEvent.id) {
    throw new Error(
      `Payday allocation is restricted to the next immediate upcoming paycheck (${nextImmediateEvent.expectedDate}). Future paychecks beyond the next one cannot be processed out of order.`
    );
  }

  // 2. Fetch categories and schedules to run allocation engine
  const allCategories = await dbClient
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.tenantId, tenantId),
        eq(categories.appId, appId),
        sql`${categories.archivedAt} IS NULL`
      )
    );

  const allSchedules = await dbClient
    .select()
    .from(categorySchedules)
    .where(
      and(
        eq(categorySchedules.tenantId, tenantId),
        eq(categorySchedules.appId, appId),
        sql`${categorySchedules.archivedAt} IS NULL`
      )
    );

  const scheduleMap = new Map(allSchedules.map((s) => [s.categoryId, s]));

  // Calculate current balances from transaction_ledger
  const ledgerSums = await dbClient
    .select({
      categoryId: transactionLedger.categoryId,
      balance: sql<string>`COALESCE(SUM(CASE WHEN ${transactionLedger.flowType} = 'CREDIT' THEN ${transactionLedger.amount} ELSE -${transactionLedger.amount} END), 0)::text`,
    })
    .from(transactionLedger)
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        sql`${transactionLedger.archivedAt} IS NULL`
      )
    )
    .groupBy(transactionLedger.categoryId);

  const balanceMap = new Map(ledgerSums.map((l) => [l.categoryId, parseFloat(l.balance)]));

  const engineBuckets: EngineBucket[] = allCategories.map((c) => {
    const sched = scheduleMap.get(c.id);
    return {
      id: c.id,
      name: c.name,
      type: c.type as any,
      isCommitted: c.isCommitted,
      isDefaultExcess: c.isDefaultExcess,
      monthlyAmount: c.monthlyAmount ? parseFloat(c.monthlyAmount) : null,
      targetAmount: sched?.targetAmount ? parseFloat(sched.targetAmount) : null,
      targetDate: sched?.targetDate || null,
      currentBalance: balanceMap.get(c.id) || 0,
      paycheckFrequencyDays: 14,
    };
  });

  const paycheckDate = new Date(targetEvent.expectedDate);
  const incomeAmount = parseFloat(targetEvent.actualAmount || targetEvent.expectedAmount);

  const allocationResult = runAllocationEngine({
    incomeAmount,
    buckets: engineBuckets,
    paycheckDate,
    paycheckFrequencyDays: 14,
  });

  return {
    incomeEvent: {
      id: targetEvent.id,
      expectedDate: targetEvent.expectedDate,
      expectedAmount: targetEvent.expectedAmount,
      actualAmount: targetEvent.actualAmount || targetEvent.expectedAmount,
    },
    engineResult: allocationResult,
  };
}
