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
import { computeMatrixProjection, MatrixIncomeEvent, ScheduledExpenseEvent } from "../engine/matrix-projection-engine.js";
import { EngineBucket } from "../engine/allocation-engine.js";

export interface ProjectedPoolBalancesOutput {
  columns: Array<{
    id: string;
    date: string;
    dateLabel: string;
    totalIncome: number;
    sourceName: string;
  }>;
  poolBalances: Record<string, Record<string, number>>; // poolId -> (columnId -> projectedBalance)
}

export async function getProjectedPoolBalancesQuery(
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
): Promise<ProjectedPoolBalancesOutput> {
  // 1. Fetch pools, categories, and ledger transactions
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
      isPrivate: (pool as unknown as { isPrivate?: boolean }).isPrivate ?? false,
      userId: (pool as unknown as { userId?: string }).userId ?? undefined,
    };
  });

  // 2. Fetch pending income events
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

  const matrixIncomeEvents: MatrixIncomeEvent[] = pendingIncomesRaw.map((e) => ({
    id: e.id,
    sourceName: e.name,
    expectedDate: e.expectedDate,
    expectedAmount: parseFloat(e.expectedAmount),
    actualAmount: e.actualAmount ? parseFloat(e.actualAmount) : null,
    status: e.status as "PENDING" | "CONFIRMED" | "DRAFT" | "REVIEWED",
    rrule: e.rrule,
  }));

  // 3. Fetch pending expense events
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

  const matrixExpenseEvents: ScheduledExpenseEvent[] = pendingExpensesRaw.map((e) => ({
    categoryId: e.poolId || e.categoryId || "",
    dueDate: e.expectedDate,
    amount: parseFloat(e.expectedAmount),
    status: e.status as "PENDING" | "CONFIRMED",
  }));

  // 4. Fetch cell overrides
  const pendingPlans = await dbClient
    .select({
      incomeEventId: allocationPlans.incomeEventId,
      poolId: allocationPlanLines.poolId,
      proposedAmount: allocationPlanLines.proposedAmount,
      confirmedAmount: allocationPlanLines.confirmedAmount,
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

  const cellOverrides: Record<string, number> = {};
  for (const p of pendingPlans) {
    cellOverrides[`${p.incomeEventId}_${p.poolId}`] = parseFloat(p.confirmedAmount || p.proposedAmount);
  }

  // 5. Compute matrix projection
  const projection = computeMatrixProjection({
    currentUserId: userId,
    categories: engineBuckets,
    incomeEvents: matrixIncomeEvents,
    expenseEvents: matrixExpenseEvents,
    cellOverrides,
    monthsAhead: 12,
  });

  const poolBalances: Record<string, Record<string, number>> = {};
  for (const group of projection.groups) {
    for (const row of group.rows) {
      poolBalances[row.categoryId] = {};
      for (const col of projection.columns) {
        poolBalances[row.categoryId][col.id] = row.cells[col.id]?.projectedBalance ?? 0;
      }
    }
  }

  return {
    columns: projection.columns.map((c) => ({
      id: c.id,
      date: c.date,
      dateLabel: c.dateLabel,
      totalIncome: c.totalIncome,
      sourceName: c.sourceName,
    })),
    poolBalances,
  };
}
