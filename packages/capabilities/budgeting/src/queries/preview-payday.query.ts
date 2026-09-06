import {
  incomeEvents,
  incomeSources,
  pools,
  categories,
  transactionLedger,
  allocationPlans,
  allocationPlanLines,
  expenseEvents,
  DbOrTx,
} from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import {
  runCumulativeProjection,
  CumulativeProjectionIncomeEvent,
  CumulativeProjectionExpenseEvent,
  SavedPlanLineItem,
} from "../engine/cumulative-projection.js";
import { EngineBucket } from "../engine/allocation-engine.js";
import { previewAllocationQuery } from "./preview-allocation.query.js";

export async function previewPaydayQuery(
  incomeEventId: string,
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
) {
  const [targetEvent] = await dbClient
    .select({
      id: incomeEvents.id,
      expectedDate: incomeEvents.expectedDate,
      expectedAmount: incomeEvents.expectedAmount,
      actualAmount: incomeEvents.actualAmount,
      name: sql<string>`COALESCE(NULLIF(${incomeEvents.name}, ''), ${incomeSources.name}, 'Paycheck')`,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
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
  // 1. Check for an existing plan (CONFIRMED or PENDING) for this specific income event
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

  // If a CONFIRMED plan exists, return its saved lines directly
  if (existingPlan && existingPlan.status === "CONFIRMED") {
    const savedLines = await dbClient
      .select({
        id: allocationPlanLines.id,
        poolId: allocationPlanLines.poolId,
        proposedAmount: allocationPlanLines.proposedAmount,
        confirmedAmount: allocationPlanLines.confirmedAmount,
        reasoning: allocationPlanLines.reasoning,
        poolName: pools.name,
      })
      .from(allocationPlanLines)
      .leftJoin(pools, eq(pools.id, allocationPlanLines.poolId))
      .where(eq(allocationPlanLines.planId, existingPlan.id));

    if (savedLines.length > 0) {
      const lines = savedLines.map((l) => ({
        bucketId: l.poolId,
        bucketName: l.poolName ?? "Unknown Pool",
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
          isCustomPlan: false,
          isConfirmedPlan: true,
        },
      };
    }
  }

  // 2. Fetch all pools, categories, and ledger transactions to build engine buckets
  const dbPools = await dbClient
    .select()
    .from(pools)
    .where(
      and(
        eq(pools.tenantId, tenantId),
        eq(pools.appId, appId),
        sql`${pools.archivedAt} IS NULL`
      )
    );

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

  const poolCategoryTargetsMap = new Map<string, number>();
  for (const cat of dbCats) {
    if (cat.monthlyAmount) {
      const val = parseFloat(cat.monthlyAmount);
      poolCategoryTargetsMap.set(cat.poolId, (poolCategoryTargetsMap.get(cat.poolId) || 0) + val);
    }
  }

  const txs = await dbClient
    .select({
      poolId: transactionLedger.poolId,
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

  const poolBalancesMap: Record<string, number> = {};
  for (const pool of dbPools) {
    poolBalancesMap[pool.id] = 0;
  }
  for (const tx of txs) {
    if (!tx.poolId) continue;
    const val = parseFloat(tx.amount);
    if (tx.flowType === "CREDIT") {
      poolBalancesMap[tx.poolId] = (poolBalancesMap[tx.poolId] || 0) + val;
    } else {
      poolBalancesMap[tx.poolId] = (poolBalancesMap[tx.poolId] || 0) - val;
    }
  }

  const engineBuckets: EngineBucket[] = dbPools.map((pool) => {
    const balance = poolBalancesMap[pool.id] || 0;
    const catTargetSum = poolCategoryTargetsMap.get(pool.id) || 0;

    const monthlyAmt =
      pool.poolType === "REGULAR"
        ? catTargetSum > 0
          ? catTargetSum
          : pool.targetAmount
          ? parseFloat(pool.targetAmount)
          : null
        : pool.targetAmount
        ? parseFloat(pool.targetAmount)
        : null;

    return {
      id: pool.id,
      name: pool.name,
      type: pool.poolType,
      isCommitted: pool.isCommitted,
      isSurplusTarget: pool.isSurplusTarget,
      monthlyAmount: monthlyAmt,
      targetAmount: pool.targetAmount ? parseFloat(pool.targetAmount) : null,
      everydayAllowanceAmount: pool.everydayAllowanceAmount ? parseFloat(pool.everydayAllowanceAmount) : null,
      targetDate: pool.targetDate || null,
      currentBalance: balance,
      isPrivate: false,
    };
  });

  // 3. Fetch all pending income events for cumulative projection
  const pendingIncomesRaw = await dbClient
    .select({
      id: incomeEvents.id,
      expectedDate: incomeEvents.expectedDate,
      expectedAmount: incomeEvents.expectedAmount,
      actualAmount: incomeEvents.actualAmount,
      status: incomeEvents.status,
      name: sql<string>`COALESCE(NULLIF(${incomeEvents.name}, ''), ${incomeSources.name}, 'Paycheck')`,
      rrule: incomeSources.rrule,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .where(
      and(
        eq(incomeEvents.tenantId, tenantId),
        eq(incomeEvents.appId, appId),
        sql`${incomeEvents.status} != 'CONFIRMED'`,
        sql`${incomeEvents.archivedAt} IS NULL`
      )
    );

  const cumIncomeEvents: CumulativeProjectionIncomeEvent[] = pendingIncomesRaw.map((e) => ({
    id: e.id,
    sourceName: e.name,
    expectedDate: e.expectedDate,
    expectedAmount: parseFloat(e.expectedAmount),
    actualAmount: e.actualAmount ? parseFloat(e.actualAmount) : null,
    status: e.status as "PENDING" | "CONFIRMED" | "DRAFT" | "REVIEWED",
    rrule: e.rrule,
  }));

  // Ensure targetEvent is present in cumIncomeEvents if it's pending
  if (!cumIncomeEvents.some((e) => e.id === targetEvent.id)) {
    cumIncomeEvents.push({
      id: targetEvent.id,
      sourceName: targetEvent.name || "Paycheck",
      expectedDate: targetEvent.expectedDate,
      expectedAmount: parseFloat(targetEvent.expectedAmount),
      actualAmount: targetEvent.actualAmount ? parseFloat(targetEvent.actualAmount) : null,
      status: "PENDING",
    });
  }

  // 4. Fetch all PENDING saved allocation plans for pending income events
  const pendingPlans = await dbClient
    .select({
      planId: allocationPlans.id,
      incomeEventId: allocationPlans.incomeEventId,
      poolId: allocationPlanLines.poolId,
      proposedAmount: allocationPlanLines.proposedAmount,
      confirmedAmount: allocationPlanLines.confirmedAmount,
      reasoning: allocationPlanLines.reasoning,
    })
    .from(allocationPlans)
    .innerJoin(allocationPlanLines, eq(allocationPlans.id, allocationPlanLines.planId))
    .where(
      and(
        eq(allocationPlans.tenantId, tenantId),
        eq(allocationPlans.appId, appId),
        eq(allocationPlans.status, "PENDING"),
        sql`${allocationPlans.archivedAt} IS NULL`
      )
    );

  const savedPlansMap: Record<string, SavedPlanLineItem[]> = {};
  for (const p of pendingPlans) {
    if (!savedPlansMap[p.incomeEventId]) {
      savedPlansMap[p.incomeEventId] = [];
    }
    savedPlansMap[p.incomeEventId].push({
      poolId: p.poolId,
      proposedAmount: parseFloat(p.confirmedAmount || p.proposedAmount),
      reasoning: p.reasoning,
    });
  }

  // 5. Fetch all PENDING expense events
  const pendingExpensesRaw = await dbClient
    .select({
      id: expenseEvents.id,
      poolId: expenseEvents.poolId,
      categoryId: expenseEvents.categoryId,
      expectedDate: expenseEvents.expectedDate,
      expectedAmount: expenseEvents.expectedAmount,
      status: expenseEvents.status,
    })
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        eq(expenseEvents.status, "PENDING"),
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );

  const cumExpenseEvents: CumulativeProjectionExpenseEvent[] = pendingExpensesRaw.map((e) => ({
    poolId: e.poolId,
    categoryId: e.categoryId,
    dueDate: e.expectedDate,
    amount: parseFloat(e.expectedAmount),
    status: e.status as "PENDING" | "CONFIRMED",
  }));

  // 6. Run the cumulative projection engine
  const projection = runCumulativeProjection({
    categories: engineBuckets,
    incomeEvents: cumIncomeEvents,
    expenseEvents: cumExpenseEvents,
    savedPlans: savedPlansMap,
  });

  const step = projection.getStepForEvent(targetEvent.id);

  if (step) {
    const lines = engineBuckets.map((bucket) => {
      const detail = step.allocations.get(bucket.id);
      return {
        bucketId: bucket.id,
        bucketName: bucket.name,
        proposedAmount: detail?.proposedAmount ?? 0,
        reasoning: detail?.reasoning ?? "Automatic cumulative projection",
      };
    });

    const incomeAmt = parseFloat(targetEvent.actualAmount || targetEvent.expectedAmount);
    const totalAllocated = lines.reduce((sum, l) => sum + l.proposedAmount, 0);

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
        isCustomPlan: Boolean(savedPlansMap[targetEvent.id]?.length),
        isConfirmedPlan: false,
      },
    };
  }

  // Fallback if step is not found
  const incomeAmount = parseFloat(targetEvent.actualAmount || targetEvent.expectedAmount);
  const allocationResult = await previewAllocationQuery(tenantId, appId, targetEvent.id, incomeAmount, dbClient);

  const lines = Array.isArray(allocationResult)
    ? allocationResult.map((item) => ({
        bucketId: item.poolId,
        bucketName: item.poolName,
        proposedAmount: item.proposedAmount,
        reasoning: item.reasoning,
      }))
    : [];

  const totalAllocated = lines.reduce((sum, l) => sum + l.proposedAmount, 0);

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
      unallocatedAmount: Math.max(0, incomeAmount - totalAllocated),
      isCustomPlan: false,
      isConfirmedPlan: false,
    },
  };
}
