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
  // Check if a saved allocation plan (DRAFT/PENDING or CONFIRMED) exists for this event
  const { allocationPlans, allocationPlanLines } = await import("@money-matters/db");
  const [existingPlan] = await dbClient
    .select()
    .from(allocationPlans)
    .where(
      and(
        eq(allocationPlans.incomeEventId, targetEvent.id),
        eq(allocationPlans.tenantId, tenantId),
        eq(allocationPlans.appId, appId),
        sql`${allocationPlans.archivedAt} IS NULL`
      )
    )
    .orderBy(sql`${allocationPlans.createdAt} DESC`)
    .limit(1);

  if (existingPlan) {
    const savedLines = await dbClient
      .select({
        id: allocationPlanLines.id,
        categoryId: allocationPlanLines.categoryId,
        proposedAmount: allocationPlanLines.proposedAmount,
        confirmedAmount: allocationPlanLines.confirmedAmount,
        reasoning: allocationPlanLines.reasoning,
        categoryName: categories.name,
      })
      .from(allocationPlanLines)
      .leftJoin(categories, eq(categories.id, allocationPlanLines.categoryId))
      .where(eq(allocationPlanLines.planId, existingPlan.id));

    if (savedLines.length > 0) {
      const lines = savedLines.map((l) => ({
        bucketId: l.categoryId,
        bucketName: l.categoryName ?? "Unknown Category",
        proposedAmount: parseFloat(l.confirmedAmount || l.proposedAmount),
        reasoning: l.reasoning ?? "Custom saved allocation plan",
      }));

      const totalAllocated = lines.reduce((sum, l) => sum + l.proposedAmount, 0);
      const incomeAmt = parseFloat(targetEvent.actualAmount || targetEvent.expectedAmount);

      return {
        incomeEvent: {
          id: targetEvent.id,
          name: targetEvent.name || "Paycheck",
          expectedDate: targetEvent.expectedDate,
          expectedAmount: targetEvent.expectedAmount,
          actualAmount: targetEvent.actualAmount || targetEvent.expectedAmount,
        },
        engineResult: {
          status: "OK" as const,
          lines,
          unallocatedAmount: Math.max(0, incomeAmt - totalAllocated),
          isCustomPlan: true,
        },
      };
    }
  }

  // Fetch categories and schedules to run allocation engine if no saved plan exists
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
