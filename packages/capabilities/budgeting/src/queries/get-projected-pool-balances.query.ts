import {
  incomeEvents,
  incomeSources,
  envelopes,
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
  poolBalances: Record<string, Record<string, number>>;
}

export async function getProjectedPoolBalancesQuery(
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
): Promise<ProjectedPoolBalancesOutput> {
  // 1. Fetch envelopes and ledger transactions
  const dbEnvelopes = await dbClient
    .select()
    .from(envelopes)
    .where(
      and(
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        sql`${envelopes.archivedAt} IS NULL`
      )
    );

  const txs = await dbClient
    .select({
      envelopeId: transactionLedger.envelopeId,
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

  const envBalancesMap: Record<string, number> = {};
  for (const env of dbEnvelopes) {
    envBalancesMap[env.id] = 0;
  }
  for (const tx of txs) {
    if (!tx.envelopeId) continue;
    const val = parseFloat(tx.amount);
    if (tx.flowType === "CREDIT") {
      envBalancesMap[tx.envelopeId] = (envBalancesMap[tx.envelopeId] || 0) + val;
    } else {
      envBalancesMap[tx.envelopeId] = (envBalancesMap[tx.envelopeId] || 0) - val;
    }
  }

  const engineBuckets: EngineBucket[] = dbEnvelopes.map((env) => ({
    id: env.id,
    name: env.name,
    type: env.envelopeType,
    envelopeType: env.envelopeType,
    isEssential: env.isEssential,
    isCommitted: env.isCommitted,
    isSurplusTarget: env.isSurplusTarget,
    monthlyAmount: env.monthlyAmount ? parseFloat(env.monthlyAmount) : null,
    targetAmount: env.targetAmount ? parseFloat(env.targetAmount) : null,
    safetyBufferFloor: env.safetyBufferFloor ? parseFloat(env.safetyBufferFloor) : 0,
    goalMode: env.goalMode ?? (env.envelopeType === "TARGET_GOAL" ? "TARGET_DATE" : "ONGOING"),
    targetDate: env.endDate || null,
    currentBalance: envBalancesMap[env.id] || 0,
    isPrivate: env.isPrivate,
    userId: env.userId ?? undefined,
  }));

  // 2. Fetch pending income events
  const pendingIncomesRaw = await dbClient
    .select({
      id: incomeEvents.id,
      expectedDate: incomeEvents.expectedDate,
      expectedAmount: incomeEvents.expectedAmount,
      actualAmount: incomeEvents.actualAmount,
      status: incomeEvents.status,
      name: sql`COALESCE(NULLIF(${incomeEvents.name}, ""), ${incomeSources.name}, "Paycheck")`,
      rrule: incomeSources.rrule,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .where(
      and(
        eq(incomeEvents.tenantId, tenantId),
        eq(incomeEvents.appId, appId),
        sql`${incomeEvents.status} != "CONFIRMED"`,
        sql`${incomeEvents.archivedAt} IS NULL`
      )
    );

  const matrixIncomeEvents: MatrixIncomeEvent[] = pendingIncomesRaw.map((e) => ({
    id: e.id,
    sourceName: String(e.name || "Paycheck"),
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
      envelopeId: expenseEvents.envelopeId,
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
    categoryId: e.envelopeId,
    dueDate: e.expectedDate,
    amount: parseFloat(e.expectedAmount),
    status: e.status as "PENDING" | "CONFIRMED",
  }));

  // 4. Fetch cell overrides
  const pendingPlans = await dbClient
    .select({
      incomeEventId: allocationPlans.incomeEventId,
      envelopeId: allocationPlanLines.envelopeId,
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
    cellOverrides[`${p.incomeEventId}_${p.envelopeId}`] = parseFloat(p.confirmedAmount || p.proposedAmount);
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
