import {
  incomeEvents,
  incomeSources,
  envelopes,
  bankAccounts,
  transactionLedger,
  allocationPlans,
  allocationPlanLines,
  expenseEvents,
  getEnvelopeBalancesMap,
  tenants,
  DbOrTx,
} from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { computeMatrixProjection, MatrixIncomeEvent, ScheduledExpenseEvent } from "../engine/horizon-projection-engine.js";
import { EngineBucket } from "../engine/allocation-engine.js";

export interface ProjectedPoolBalancesOutput {
  columns: Array<{
    id: string;
    date: string;
    dateLabel: string;
    totalIncome: number;
    sourceName: string;
  }>;
  envelopeBalances: Record<string, Record<string, number>>;
  poolBalances: Record<string, Record<string, number>>;
}

export async function getProjectedPoolBalancesQuery(
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
): Promise<ProjectedPoolBalancesOutput> {
  // 1. Fetch envelopes, balances map, and tenant timezone concurrently
  const [dbEnvelopes, envBalancesMap, tenantRecord] = await Promise.all([
    dbClient
      .select({
        id: envelopes.id,
        name: envelopes.name,
        envelopeType: envelopes.envelopeType,
        bankAccountId: envelopes.bankAccountId,
        safetyBufferFloor: envelopes.safetyBufferFloor,
        monthlyAmount: envelopes.monthlyAmount,
        enteredAmount: envelopes.enteredAmount,
        budgetFrequency: envelopes.budgetFrequency,
        startDate: envelopes.startDate,
        endDate: envelopes.endDate,
        rrule: envelopes.rrule,
        fundingMode: envelopes.fundingMode,
        targetAmount: envelopes.targetAmount,
        isPriority: envelopes.isPriority,
        isSurplusTarget: envelopes.isSurplusTarget,
        isPrivate: envelopes.isPrivate,
        generateEvents: envelopes.generateEvents,
        userId: envelopes.userId,
        orderIndex: envelopes.orderIndex,
        bankAccountIsPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(envelopes)
      .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
      .where(
        and(
          eq(envelopes.tenantId, tenantId),
          eq(envelopes.appId, appId),
          sql`${envelopes.archivedAt} IS NULL`
        )
      ),
    getEnvelopeBalancesMap(tenantId, appId, dbClient),
    dbClient
      .select({ timezone: tenants.timezone })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1),
  ]);

  const visibleEnvelopes = dbEnvelopes.filter((e) => {
    const isPrivate = Boolean(e.isPrivate || e.bankAccountIsPrivate);
    if (!isPrivate) return true;
    const ownerId = e.userId || e.bankAccountUserId;
    return ownerId === userId;
  });
  const visibleEnvelopeIds = new Set(visibleEnvelopes.map((e) => e.id));

  const tenantTimezone = tenantRecord[0]?.timezone || "UTC";

  const { mapEnvelopeToEngineBucket } = await import("../engine/envelope-engine-mapper.js");
  const engineBuckets: EngineBucket[] = visibleEnvelopes.map((env) =>
    mapEnvelopeToEngineBucket(env as unknown as Parameters<typeof mapEnvelopeToEngineBucket>[0], envBalancesMap[env.id] || 0)
  );

  // 2. Fetch pending income events
  const pendingIncomesRaw = await dbClient
    .select({
      id: incomeEvents.id,
      expectedDate: incomeEvents.expectedDate,
      expectedAmount: incomeEvents.expectedAmount,
      actualAmount: incomeEvents.actualAmount,
      status: incomeEvents.status,
      name: sql`COALESCE(NULLIF(${incomeEvents.name}, ''), ${incomeSources.name}, 'Paycheck')`,
      rrule: incomeSources.rrule,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
    .where(
      and(
        eq(incomeEvents.tenantId, tenantId),
        eq(incomeEvents.appId, appId),
        sql`${incomeEvents.status} != 'CONFIRMED'`,
        sql`${incomeEvents.archivedAt} IS NULL`
      )
    );

  const filteredIncomes = pendingIncomesRaw.filter((e) => {
    if (!e.bankAccountIsPrivate) return true;
    return e.bankAccountUserId === userId;
  });

  const matrixIncomeEvents: MatrixIncomeEvent[] = filteredIncomes.map((e) => ({
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

  const matrixExpenseEvents: ScheduledExpenseEvent[] = pendingExpensesRaw
    .filter((e) => !e.envelopeId || visibleEnvelopeIds.has(e.envelopeId))
    .map((e) => ({
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
    if (visibleEnvelopeIds.has(p.envelopeId)) {
      cellOverrides[`${p.incomeEventId}_${p.envelopeId}`] = parseFloat(p.confirmedAmount || p.proposedAmount);
    }
  }

  // 5. Compute matrix projection
  const projection = computeMatrixProjection({
    currentUserId: userId,
    categories: engineBuckets,
    incomeEvents: matrixIncomeEvents,
    expenseEvents: matrixExpenseEvents,
    cellOverrides,
    monthsAhead: 12,
    timezone: tenantTimezone,
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
    envelopeBalances: poolBalances,
    poolBalances,
  };
}
