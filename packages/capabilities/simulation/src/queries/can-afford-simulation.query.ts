/**
 * Can I Afford It? — Simulation Query
 *
 * Replaces the old canAffordQuery in the transactions capability.
 * Uses the cumulative waterfall projection engine from the budgeting capability
 * to produce a forward-looking affordability verdict with enriched signals:
 * - Deducts upcoming expense events from effective Everyday balance (BILLS_RISK detection)
 * - Projects earliest affordable paycycle using cumulative projection steps (WAIT_FOR_PAYCYCLE)
 * - Injects phantom REGULAR bucket for recurring mode to measure goal timeline impacts (GOAL_DELAYED)
 * - Dynamic pacing floor: 25% of (everydayAllowanceAmount / 30) — adapts per user's configured budget
 *
 * Architecture note: This capability imports engine utilities from @money-matters/capability-budgeting.
 * This is the single sanctioned cross-capability import in the monorepo — justified because simulation
 * is a stateless pure-computation layer with zero DB writes, not a vertical feature slice.
 */
import {
  pools,
  bankAccounts,
  incomeEvents,
  incomeSources,
  expenseEvents,
  categories,
  getPoolBalancesMap,
  type DbOrTx,
} from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import {
  runCumulativeProjection,
  type CumulativeProjectionIncomeEvent,
  type CumulativeProjectionExpenseEvent,
  type EngineBucket,
} from "@money-matters/capability-budgeting";
import type { CanAffordVerdictType } from "@money-matters/types";
import { getTenantDateString } from "@money-matters/core";

const getAestDateString = (d: Date = new Date()) => getTenantDateString(d);

/** Convert an amount from any frequency to its monthly-equivalent. */
function toMonthlyAmount(
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
  _userId: string,
  dbClient: DbOrTx
): Promise<CanAffordVerdictType> {
  const amount = parseFloat(input.amount);
  const mode = input.mode ?? "ONE_OFF";
  const frequency = input.frequency ?? "MONTHLY";
  const includePersonal = input.includePersonal ?? false;
  const today = new Date();
  const todayStr = getAestDateString(today);

  // ── 1. PARALLEL DATA FETCH ──────────────────────────────────────────────
  const [dbPools, poolBalancesMap, pendingIncomesRaw, pendingExpensesRaw, dbCats] =
    await Promise.all([
      // Pools joined with bank account privacy metadata
      dbClient
        .select({
          id: pools.id,
          name: pools.name,
          poolType: pools.poolType,
          bankAccountId: pools.bankAccountId,
          everydayAllowanceAmount: pools.everydayAllowanceAmount,
          targetAmount: pools.targetAmount,
          targetDate: pools.targetDate,
          isCommitted: pools.isCommitted,
          isSurplusTarget: pools.isSurplusTarget,
          waterfallPriority: pools.waterfallPriority,
          isPrivate: bankAccounts.isPrivate,
        })
        .from(pools)
        .innerJoin(bankAccounts, eq(pools.bankAccountId, bankAccounts.id))
        .where(
          and(
            eq(pools.tenantId, tenantId),
            eq(pools.appId, appId),
            sql`${pools.archivedAt} IS NULL`
          )
        ),

      // Pre-aggregated pool balances map
      getPoolBalancesMap(tenantId, appId, dbClient),

      // All PENDING income events sorted ascending by date
      dbClient
        .select({
          id: incomeEvents.id,
          expectedDate: incomeEvents.expectedDate,
          expectedAmount: incomeEvents.expectedAmount,
          actualAmount: incomeEvents.actualAmount,
          status: incomeEvents.status,
          sourceName: sql<string>`COALESCE(NULLIF(${incomeEvents.name}, ''), ${incomeSources.name}, 'Paycheck')`,
          rrule: incomeSources.rrule,
        })
        .from(incomeEvents)
        .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
        .where(
          and(
            eq(incomeEvents.tenantId, tenantId),
            eq(incomeEvents.appId, appId),
            eq(incomeEvents.status, "PENDING"),
            sql`${incomeEvents.archivedAt} IS NULL`
          )
        ),

      // All PENDING expense events
      dbClient
        .select({
          id: expenseEvents.id,
          poolId: expenseEvents.poolId,
          categoryId: expenseEvents.categoryId,
          name: expenseEvents.name,
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
        ),

      // Categories for monthly amount aggregation per pool
      dbClient
        .select({
          id: categories.id,
          poolId: categories.poolId,
          monthlyAmount: categories.monthlyAmount,
        })
        .from(categories)
        .where(
          and(
            eq(categories.tenantId, tenantId),
            eq(categories.appId, appId),
            sql`${categories.archivedAt} IS NULL`
          )
        ),
    ]);

  // ── 2. FILTER POOLS BY PRIVACY ─────────────────────────────────────────
  const visiblePools = dbPools.filter((p) => includePersonal || !p.isPrivate);
  const everydayPools = visiblePools.filter((p) => p.poolType === "EVERYDAY");
  const regularPools = visiblePools.filter((p) => p.poolType === "REGULAR");
  const goalPools = visiblePools.filter((p) => p.poolType === "GOAL");

  // ── 3. COMPUTE BALANCES ────────────────────────────────────────────────
  const everydayBalance = everydayPools.reduce(
    (sum, p) => sum + (poolBalancesMap[p.id] ?? 0),
    0
  );

  // ── 4. DETERMINE NEXT PAYDAY ──────────────────────────────────────────
  const sortedIncomes = [...pendingIncomesRaw].sort(
    (a, b) =>
      new Date(a.expectedDate + "T00:00:00").getTime() -
      new Date(b.expectedDate + "T00:00:00").getTime()
  );
  const nextPaycheck = sortedIncomes[0] ?? null;
  const nextPaycheckDateStr =
    nextPaycheck?.expectedDate ??
    getAestDateString(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000));

  const daysUntilPayday = Math.max(
    1,
    Math.ceil(
      (new Date(nextPaycheckDateStr + "T00:00:00+10:00").getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  // ── 5. UPCOMING BILLS BEFORE NEXT PAYDAY ─────────────────────────────
  const regularPoolIds = new Set(regularPools.map((p) => p.id));
  const billsDueBeforePayday = pendingExpensesRaw.filter(
    (e) =>
      e.expectedDate >= todayStr &&
      e.expectedDate <= nextPaycheckDateStr &&
      regularPoolIds.has(e.poolId ?? "")
  );
  const totalBillsBeforePayday = billsDueBeforePayday.reduce(
    (sum, e) => sum + parseFloat(e.expectedAmount),
    0
  );
  const effectiveSpendable = Math.max(0, everydayBalance - totalBillsBeforePayday);

  // ── 6. DYNAMIC PACING FLOOR (25% of daily allowance) ─────────────────
  const everydayMonthlyAllowance = everydayPools.reduce((sum, p) => {
    const amt = parseFloat(p.everydayAllowanceAmount ?? p.targetAmount ?? "0");
    return sum + amt;
  }, 0);
  const dailyAllowance = everydayMonthlyAllowance / 30;
  // 25% of daily target = pacing floor; if no allowance configured, use $15 as fallback
  const pacingFloor = dailyAllowance > 0 ? dailyAllowance * 0.25 : 15;

  // ── 7. BUILD ENGINE BUCKETS ───────────────────────────────────────────
  const poolCategoryTargetsMap = new Map<string, number>();
  for (const cat of dbCats) {
    if (cat.monthlyAmount) {
      const val = parseFloat(cat.monthlyAmount);
      poolCategoryTargetsMap.set(cat.poolId, (poolCategoryTargetsMap.get(cat.poolId) ?? 0) + val);
    }
  }

  const engineBuckets: EngineBucket[] = visiblePools.map((pool) => {
    const balance = poolBalancesMap[pool.id] ?? 0;
    const catTargetSum = poolCategoryTargetsMap.get(pool.id) ?? 0;
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
      type: pool.poolType as "EVERYDAY" | "REGULAR" | "GOAL",
      isCommitted: pool.isCommitted ?? false,
      isSurplusTarget: pool.isSurplusTarget ?? false,
      monthlyAmount: monthlyAmt,
      targetAmount: pool.targetAmount ? parseFloat(pool.targetAmount) : null,
      everydayAllowanceAmount: pool.everydayAllowanceAmount
        ? parseFloat(pool.everydayAllowanceAmount)
        : null,
      targetDate: pool.targetDate ?? null,
      currentBalance: balance,
      isPrivate: pool.isPrivate ?? false,
    };
  });

  // ── 8. RECURRING MODE ─────────────────────────────────────────────────
  if (mode === "RECURRING") {
    const monthlyAmount = toMonthlyAmount(amount, frequency);
    // Inject phantom REGULAR bucket simulating the new ongoing commitment
    const phantomBucket: EngineBucket = {
      id: `__phantom_recurring__`,
      name: input.itemName ?? "New Recurring Commitment",
      type: "REGULAR",
      isCommitted: false,
      isSurplusTarget: false,
      monthlyAmount,
      targetAmount: null,
      everydayAllowanceAmount: null,
      targetDate: null,
      currentBalance: 0,
      isPrivate: false,
    };

    const cumExpenses: CumulativeProjectionExpenseEvent[] = pendingExpensesRaw.map((e) => ({
      poolId: e.poolId,
      categoryId: e.categoryId,
      dueDate: e.expectedDate,
      amount: parseFloat(e.expectedAmount),
      status: e.status as "PENDING" | "CONFIRMED",
    }));

    const cumIncomes: CumulativeProjectionIncomeEvent[] = sortedIncomes.map((e) => ({
      id: e.id,
      sourceName: e.sourceName,
      expectedDate: e.expectedDate,
      expectedAmount: parseFloat(e.expectedAmount),
      actualAmount: e.actualAmount ? parseFloat(e.actualAmount) : null,
      status: e.status as "PENDING" | "CONFIRMED" | "DRAFT" | "REVIEWED",
      rrule: e.rrule,
    }));

    // Projection WITHOUT phantom — baseline goal final balances
    const projectionWithout = runCumulativeProjection({
      categories: engineBuckets,
      incomeEvents: cumIncomes,
      expenseEvents: cumExpenses,
    });

    // Projection WITH phantom bucket — measures goal timeline impact
    const projectionWith = runCumulativeProjection({
      categories: [...engineBuckets, phantomBucket],
      incomeEvents: cumIncomes,
      expenseEvents: cumExpenses,
    });

    const goalDelays: Array<{
      goalId: string;
      goalName: string;
      isCommitted: boolean;
      originalTargetDate: string | null;
      newTargetDate: string | null;
      delayDays: number;
    }> = [];

    for (const pool of goalPools) {
      if (!pool.targetDate || !pool.targetAmount) continue;

      const originalFinalBalance = projectionWithout.finalBalances.get(pool.id) ?? 0;
      const newFinalBalance = projectionWith.finalBalances.get(pool.id) ?? 0;
      const balanceDrop = originalFinalBalance - newFinalBalance;
      if (balanceDrop <= 0.01) continue; // No meaningful impact

      // Estimate delay days from balance drop vs. daily contribution rate
      const poolMonthlyContrib =
        poolCategoryTargetsMap.get(pool.id) ??
        (pool.targetAmount ? parseFloat(pool.targetAmount) / 12 : 0);
      const dailyContrib = poolMonthlyContrib > 0 ? poolMonthlyContrib / 30 : 1;
      const delayDays = Math.max(1, Math.round(balanceDrop / dailyContrib));

      const originalDate = new Date(pool.targetDate + "T00:00:00+10:00");
      const newDate = new Date(originalDate.getTime() + delayDays * 24 * 60 * 60 * 1000);

      goalDelays.push({
        goalId: pool.id,
        goalName: pool.name,
        isCommitted: pool.isCommitted ?? false,
        originalTargetDate: pool.targetDate,
        newTargetDate: newDate.toISOString().split("T")[0],
        delayDays,
      });
    }

    if (goalDelays.length > 0) {
      return {
        verdict: "GOAL_DELAYED",
        isAffordable: true,
        goalDelays,
        recurringMonthlyImpact: monthlyAmount.toFixed(2),
        rationaleSteps: [
          `New ${frequency.toLowerCase()} commitment of $${amount.toFixed(2)} ($${monthlyAmount.toFixed(2)}/mo) injected into waterfall.`,
          `${goalDelays.length} goal(s) impacted across 12-month projection.`,
          ...goalDelays.map(
            (g) =>
              `"${g.goalName}" (${g.isCommitted ? "committed" : "optional"}): pushed back ~${g.delayDays} days.`
          ),
        ],
      };
    }

    // Recurring affordable with no goal delays — SAFE_YES
    return {
      verdict: "SAFE_YES",
      availableCash: everydayBalance.toFixed(2),
      effectiveSpendable: effectiveSpendable.toFixed(2),
      everydayRemaining: effectiveSpendable.toFixed(2),
      daysUntilPayday,
      dailyPacingAfterSpend: Math.max(0, (effectiveSpendable - monthlyAmount / 30) / daysUntilPayday).toFixed(2),
      dailyPacingFloor: pacingFloor.toFixed(2),
      upcomingBillsBeforePayday: totalBillsBeforePayday.toFixed(2),
      rationaleSteps: [
        `Recurring ${frequency.toLowerCase()} commitment of $${amount.toFixed(2)} ($${monthlyAmount.toFixed(2)}/mo).`,
        `No goal timeline delays detected across 12-month projection.`,
      ],
    };
  }

  // ── 9. ONE-OFF: BILLS RISK CHECK ──────────────────────────────────────
  // Has enough raw cash but bills due before payday will consume the buffer
  if (amount <= everydayBalance && amount > effectiveSpendable) {
    const billsDueItems = billsDueBeforePayday.map((e) => ({
      name: e.name,
      amount: parseFloat(e.expectedAmount).toFixed(2),
      dueDate: e.expectedDate,
    }));

    return {
      verdict: "BILLS_RISK",
      availableCash: everydayBalance.toFixed(2),
      upcomingBillsBeforePayday: totalBillsBeforePayday.toFixed(2),
      effectiveAfterBills: effectiveSpendable.toFixed(2),
      billsDueItems,
      rationaleSteps: [
        `Everyday balance: $${everydayBalance.toFixed(2)}`,
        `Upcoming bills before payday: $${totalBillsBeforePayday.toFixed(2)} (${billsDueItems.map((b) => b.name).join(", ")})`,
        `Net safe-to-spend after bills: $${effectiveSpendable.toFixed(2)} — insufficient for $${amount.toFixed(2)}`,
      ],
    };
  }

  // ── 10. ONE-OFF: IMMEDIATE AFFORDABILITY CHECK ───────────────────────
  if (amount <= effectiveSpendable) {
    const remaining = effectiveSpendable - amount;
    const dailyPacingAfterSpend = remaining / daysUntilPayday;
    const everydayRemaining = remaining.toFixed(2);

    const rationaleSteps = [
      `Everyday balance: $${everydayBalance.toFixed(2)}${includePersonal ? " (includes Personal Pools)" : ""}`,
      `Bills due before payday: $${totalBillsBeforePayday.toFixed(2)}`,
      `Net safe-to-spend today: $${effectiveSpendable.toFixed(2)}`,
      `After purchase ($${amount.toFixed(2)}): $${everydayRemaining} remaining`,
      `Daily pace for ${daysUntilPayday} days: $${dailyPacingAfterSpend.toFixed(2)}/day (floor: $${pacingFloor.toFixed(2)}/day)`,
    ];

    if (dailyPacingAfterSpend >= pacingFloor) {
      return {
        verdict: "SAFE_YES",
        availableCash: everydayBalance.toFixed(2),
        effectiveSpendable: effectiveSpendable.toFixed(2),
        everydayRemaining,
        daysUntilPayday,
        dailyPacingAfterSpend: dailyPacingAfterSpend.toFixed(2),
        dailyPacingFloor: pacingFloor.toFixed(2),
        upcomingBillsBeforePayday: totalBillsBeforePayday.toFixed(2),
        rationaleSteps,
      };
    } else {
      return {
        verdict: "PACING_TIGHT",
        availableCash: everydayBalance.toFixed(2),
        effectiveSpendable: effectiveSpendable.toFixed(2),
        everydayRemaining,
        daysUntilPayday,
        dailyPacingAfterSpend: dailyPacingAfterSpend.toFixed(2),
        dailyPacingFloor: pacingFloor.toFixed(2),
        upcomingBillsBeforePayday: totalBillsBeforePayday.toFixed(2),
        rationaleSteps,
      };
    }
  }

  // ── 11. ONE-OFF: FIND EARLIEST AFFORDABLE PAYCYCLE ───────────────────
  const cumExpenses: CumulativeProjectionExpenseEvent[] = pendingExpensesRaw.map((e) => ({
    poolId: e.poolId,
    categoryId: e.categoryId,
    dueDate: e.expectedDate,
    amount: parseFloat(e.expectedAmount),
    status: e.status as "PENDING" | "CONFIRMED",
  }));

  const cumIncomes: CumulativeProjectionIncomeEvent[] = sortedIncomes.map((e) => ({
    id: e.id,
    sourceName: e.sourceName,
    expectedDate: e.expectedDate,
    expectedAmount: parseFloat(e.expectedAmount),
    actualAmount: e.actualAmount ? parseFloat(e.actualAmount) : null,
    status: e.status as "PENDING" | "CONFIRMED" | "DRAFT" | "REVIEWED",
    rrule: e.rrule,
  }));

  const projection = runCumulativeProjection({
    categories: engineBuckets,
    incomeEvents: cumIncomes,
    expenseEvents: cumExpenses,
  });

  const everydayPoolIds = new Set(everydayPools.map((p) => p.id));
  const ordinals = ["st", "nd", "rd"];

  for (let i = 0; i < projection.steps.length; i++) {
    const step = projection.steps[i];
    let everydayAtStep = 0;
    for (const poolId of everydayPoolIds) {
      everydayAtStep += step.balancesAfterExpenses.get(poolId) ?? 0;
    }

    if (everydayAtStep >= amount) {
      const paycyclesAway = i + 1;
      const ordinal = ordinals[i] ?? "th";
      return {
        verdict: "WAIT_FOR_PAYCYCLE",
        canAffordAt: step.date,
        paycyclesAway,
        projectedEverydayAtThatDate: everydayAtStep.toFixed(2),
        shortfallToday: Math.max(0, amount - effectiveSpendable).toFixed(2),
        rationaleSteps: [
          `Current Everyday: $${everydayBalance.toFixed(2)}. After bills: $${effectiveSpendable.toFixed(2)}.`,
          `Shortfall today: -$${Math.max(0, amount - effectiveSpendable).toFixed(2)}`,
          `By your ${paycyclesAway === 1 ? "next" : `${paycyclesAway}${ordinal}`} paycycle (${step.date}), Everyday will reach ~$${everydayAtStep.toFixed(2)}.`,
        ],
      };
    }
  }

  // ── 12. HARD_NO: 12-month horizon exhausted ───────────────────────────
  const shortfall = Math.max(0, amount - effectiveSpendable);
  return {
    verdict: "HARD_NO",
    shortfall: shortfall.toFixed(2),
    horizonMonths: 12,
    rationaleSteps: [
      `Everyday balance: $${everydayBalance.toFixed(2)}. After bills: $${effectiveSpendable.toFixed(2)}.`,
      `No paycycle in the 12-month income schedule accumulates enough Everyday surplus for $${amount.toFixed(2)}.`,
      `Consider setting this as a savings goal or reviewing your income schedule.`,
    ],
  };
}
