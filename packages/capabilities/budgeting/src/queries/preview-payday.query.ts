import { incomeEvents, categories, categorySchedules, transactionLedger, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { runAllocationEngine, EngineBucket } from "../engine/allocation-engine.js";

export async function previewPaydayQuery(
  incomeEventId: string,
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
) {
  // Fetch target event by id regardless of status
  const [targetEvent] = await dbClient
    .select()
    .from(incomeEvents)
    .where(
      and(
        eq(incomeEvents.id, incomeEventId),
        eq(incomeEvents.tenantId, tenantId),
        eq(incomeEvents.appId, appId),
        sql`${incomeEvents.archivedAt} IS NULL`
      )
    );

  if (!targetEvent) {
    throw new Error("Target income event not found.");
  }

  return await previewPaydayForEvent(targetEvent, tenantId, appId, dbClient);
}

export async function previewPaydayForEvent(
  targetEvent: { id: string; expectedDate: string; expectedAmount: string; actualAmount?: string | null; name?: string | null },
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
) {
  // Fetch categories and schedules to run allocation engine
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
      type: c.type,
      isCommitted: c.isCommitted,
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
      name: targetEvent.name || "Paycheck",
      expectedDate: targetEvent.expectedDate,
      expectedAmount: targetEvent.expectedAmount,
      actualAmount: targetEvent.actualAmount || targetEvent.expectedAmount,
    },
    engineResult: allocationResult,
  };
}
