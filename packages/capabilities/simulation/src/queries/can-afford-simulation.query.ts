/**
 * Can I Afford It? — Simulation Query
 *
 * Uses the cumulative waterfall projection engine from the budgeting capability
 * to produce a forward-looking affordability verdict with user-focused signals:
 * - Ring-fences upcoming bills before payday (BILLS_RISK detection)
 * - Prorates total dollar safe cushion until payday (SAFE_YES vs PACING_TIGHT)
 * - Integrates flexible Savings Goals into "What Gives" for one-off shortfalls
 * - Enforces 80% Everyday spending allowance floor and goal delay tracking for recurring mode
 * - Provides clear Start Advice when ongoing recurring commitments fit the budget but Day-1 cash is tight
 *
 * Architecture note: Fully decoupled pure-computation layer with zero DB writes,
 * relying solely on @money-matters/types, @money-matters/core, and @money-matters/db.
 */
import {
  envelopes,
  bankAccounts,
  incomeEvents,
  incomeSources,
  expenseEvents,
  tenants,
  getEnvelopeBalancesMap,
  type DbOrTx,
} from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import type {
  CanAffordVerdictType,
  ProjectionEngineFn,
  ProjectionEngineBucket,
} from "@money-matters/types";
import { getTenantDateString } from "@money-matters/core";
import { simulateRecurringCommitment } from "./simulation-steps/recurring-simulation.js";
import { simulateOneOffPurchase } from "./simulation-steps/one-off-simulation.js";

/** Convert an amount from any frequency to its monthly-equivalent. */
export function toMonthlyAmount(
  amount: number,
  frequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY"
): number {
  switch (frequency) {
    case "WEEKLY":
      return (amount * 52) / 12;
    case "FORTNIGHTLY":
      return (amount * 26) / 12;
    case "ANNUALLY":
      return amount / 12;
    default:
      return amount; // MONTHLY
  }
}

export async function canAffordSimulationQuery(
  input: {
    amount: string;
    mode?: "ONE_OFF" | "RECURRING";
    frequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY";
    includePersonal?: boolean;
    itemName?: string;
  },
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx,
  deps: {
    projectionEngine: ProjectionEngineFn;
  }
): Promise<CanAffordVerdictType> {
  const amount = parseFloat(input.amount);
  const mode = input.mode ?? "ONE_OFF";
  const frequency = input.frequency ?? "MONTHLY";
  const includePersonal = input.includePersonal ?? false;

  // ── 1. PARALLEL DATA FETCH ──────────────────────────────────────────────
  const [tenantRecord, dbEnvelopes, envelopeBalancesMap, pendingIncomesRaw, pendingExpensesRaw] =
    await Promise.all([
      dbClient
        .select({ timezone: tenants.timezone })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1),

      // Envelopes joined with bank account privacy metadata
      dbClient
        .select({
          id: envelopes.id,
          name: envelopes.name,
          envelopeType: envelopes.envelopeType,
          bankAccountId: envelopes.bankAccountId,
          safetyBufferFloor: envelopes.safetyBufferFloor,
          goalMode: envelopes.goalMode,
          enteredAmount: envelopes.enteredAmount,
          monthlyAmount: envelopes.monthlyAmount,
          targetAmount: envelopes.targetAmount,
          endDate: envelopes.endDate,
          isCommitted: envelopes.isCommitted,
          isSurplusTarget: envelopes.isSurplusTarget,
          isPrivate: envelopes.isPrivate,
          userId: envelopes.userId,
        })
        .from(envelopes)
        .leftJoin(bankAccounts, eq(bankAccounts.id, envelopes.bankAccountId))
        .where(
          and(
            eq(envelopes.tenantId, tenantId),
            eq(envelopes.appId, appId),
            sql`${envelopes.archivedAt} IS NULL`
          )
        ),

      // Compute balances using DB-side aggregate
      getEnvelopeBalancesMap(tenantId, appId, dbClient),

      // Pending and confirmed income events joined with recurrence rule from income_sources
      dbClient
        .select({
          id: incomeEvents.id,
          sourceName: sql<string>`COALESCE(${incomeEvents.name}, ${incomeSources.name}, 'Income')`,
          expectedDate: incomeEvents.expectedDate,
          expectedAmount: incomeEvents.expectedAmount,
          actualAmount: incomeEvents.actualAmount,
          status: incomeEvents.status,
          rrule: incomeSources.rrule,
        })
        .from(incomeEvents)
        .leftJoin(incomeSources, eq(incomeSources.id, incomeEvents.incomeSourceId))
        .where(
          and(
            eq(incomeEvents.tenantId, tenantId),
            eq(incomeEvents.appId, appId),
            sql`${incomeEvents.archivedAt} IS NULL`,
            sql`${incomeEvents.status} IN ('PENDING', 'CONFIRMED')`
          )
        ),

      // Pending expense events (bills)
      dbClient
        .select({
          id: expenseEvents.id,
          name: expenseEvents.name,
          expectedDate: expenseEvents.expectedDate,
          expectedAmount: expenseEvents.expectedAmount,
          envelopeId: expenseEvents.envelopeId,
          status: expenseEvents.status,
        })
        .from(expenseEvents)
        .where(
          and(
            eq(expenseEvents.tenantId, tenantId),
            eq(expenseEvents.appId, appId),
            sql`${expenseEvents.archivedAt} IS NULL`,
            eq(expenseEvents.status, "PENDING")
          )
        ),
    ]);

  const timezone = tenantRecord[0]?.timezone ?? "UTC";
  const todayStr = getTenantDateString(new Date(), { timezone });
  const today = new Date(todayStr + "T00:00:00Z");

  // ── 2. FILTER VISIBLE ENVELOPES ───────────────────────────────────────
  const visibleEnvelopes = dbEnvelopes.filter((env) => {
    if (!env.isPrivate) return true;
    if (includePersonal) return env.userId === userId;
    return false;
  });

  const everydayEnvelopes = visibleEnvelopes.filter((e) => e.envelopeType === "EVERYDAY");
  const billsEnvelopes = visibleEnvelopes.filter(
    (e) => e.envelopeType === "SCHEDULED_BILL" || e.envelopeType === "FLEXIBLE_BILL"
  );
  const goalEnvelopes = visibleEnvelopes.filter(
    (e) => e.envelopeType === "TARGET_GOAL" || e.envelopeType === "ONGOING_GOAL"
  );


  // ── 3. COMPUTE CURRENT CASH AVAILABLE IN EVERYDAY ─────────────────────
  let everydayBalance = 0;
  for (const env of everydayEnvelopes) {
    const bal = envelopeBalancesMap[env.id] ?? 0;
    everydayBalance += bal;
  }

  // ── 4. RESOLVE NEXT PAYCHECK & TIMELINE WINDOW ─────────────────────────
  const sortedIncomes = [...pendingIncomesRaw].sort(
    (a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime()
  );

  const nextPaycheck = sortedIncomes.find((i) => i.expectedDate >= todayStr) ?? sortedIncomes[0];
  const nextPaycheckDateStr =
    nextPaycheck?.expectedDate ??
    getTenantDateString(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), { timezone });

  const nextPaycheckTime = new Date(nextPaycheckDateStr + "T00:00:00Z").getTime();
  const daysUntilPayday = Math.max(
    1,
    Math.round((nextPaycheckTime - today.getTime()) / (1000 * 60 * 60 * 24))
  );

  // ── 5. RING-FENCE UPCOMING BILLS BEFORE PAYDAY ─────────────────────────
  const billEnvIds = new Set<string>(billsEnvelopes.map((e) => e.id));
  const billsDueBeforePayday = pendingExpensesRaw.filter(
    (e) => e.expectedDate >= todayStr && e.expectedDate <= nextPaycheckDateStr
  );

  const envBillsSumMap = new Map<string, number>();
  let unassignedBillsSum = 0;

  for (const e of billsDueBeforePayday) {
    const amt = parseFloat(e.expectedAmount);
    if (e.envelopeId && billEnvIds.has(e.envelopeId)) {
      envBillsSumMap.set(e.envelopeId, (envBillsSumMap.get(e.envelopeId) ?? 0) + amt);
    } else {
      unassignedBillsSum += amt;
    }
  }

  let unfundedBillsShortfall = unassignedBillsSum;
  for (const [envId, billsSum] of envBillsSumMap.entries()) {
    const envBal = envelopeBalancesMap[envId] ?? 0;
    const shortfall = Math.max(0, billsSum - envBal);
    unfundedBillsShortfall += shortfall;
  }

  const totalBillsBeforePayday = billsDueBeforePayday.reduce(
    (sum, e) => sum + parseFloat(e.expectedAmount),
    0
  );
  const effectiveSpendable = Math.max(0, everydayBalance - unfundedBillsShortfall);

  // ── 6. PRORATED EVERYDAY SAFE CUSHION ─────────────────────────────────
  const everydayMonthlyAllowance = everydayEnvelopes.reduce((sum, e) => {
    const amt = parseFloat(e.monthlyAmount ?? e.enteredAmount ?? e.targetAmount ?? "0");
    return sum + amt;
  }, 0);
  const dailyAllowance = everydayMonthlyAllowance / 30;
  const safeCushionVal =
    dailyAllowance > 0
      ? Math.round(dailyAllowance * 0.25 * daysUntilPayday)
      : Math.round(15 * daysUntilPayday);
  const safeCushion = safeCushionVal.toFixed(2);

  // ── 7. BUILD ENGINE BUCKETS ───────────────────────────────────────────
  const engineBuckets: ProjectionEngineBucket[] = visibleEnvelopes.map((env) => {
    const balance = envelopeBalancesMap[env.id] ?? 0;
    const rawMonthly = env.monthlyAmount ?? env.enteredAmount;
    return {
      id: env.id,
      name: env.name,
      type: env.envelopeType,
      envelopeType: env.envelopeType,
      isCommitted: env.isCommitted ?? false,
      isSurplusTarget: env.isSurplusTarget ?? false,
      monthlyAmount: rawMonthly ? parseFloat(rawMonthly) : null,
      targetAmount: env.targetAmount ? parseFloat(env.targetAmount) : null,
      safetyBufferFloor: env.safetyBufferFloor
        ? parseFloat(env.safetyBufferFloor)
        : null,
      goalMode: env.goalMode ?? (env.envelopeType === "TARGET_GOAL" ? "TARGET_DATE" : "ONGOING"),
      targetDate: env.endDate ?? null,
      currentBalance: balance,
      isPrivate: env.isPrivate ?? false,
      userId: env.userId ?? undefined,
    };
  });

  // ── 8. RECURRING MODE ─────────────────────────────────────────────────
  if (mode === "RECURRING") {
    return simulateRecurringCommitment({
      amount,
      frequency,
      itemName: input.itemName,
      effectiveSpendable,
      everydayBalance,
      safeCushion,
      daysUntilPayday,
      nextPaycheckDateStr,
      totalBillsBeforePayday,
      visibleEnvelopes,
      goalEnvelopes,
      everydayEnvelopes,
      engineBuckets,
      envelopeBalancesMap,
      pendingExpensesRaw,
      sortedIncomes,
      projectionEngine: deps.projectionEngine,
      today,
      timezone,
    });
  }

  // ── 9. ONE-OFF MODE ───────────────────────────────────────────────────
  return simulateOneOffPurchase({
    amount,
    includePersonal,
    effectiveSpendable,
    everydayBalance,
    safeCushion,
    safeCushionVal,
    daysUntilPayday,
    nextPaycheckDateStr,
    totalBillsBeforePayday,
    billsDueBeforePayday,
    goalEnvelopes,
    everydayEnvelopes,
    visibleEnvelopes,
    engineBuckets,
    envelopeBalancesMap,
    pendingExpensesRaw,
    sortedIncomes,
    dailyAllowance,
    projectionEngine: deps.projectionEngine,
    timezone,
  });
}
