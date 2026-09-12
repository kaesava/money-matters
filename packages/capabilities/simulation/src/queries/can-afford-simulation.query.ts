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
 * Architecture note: This capability imports engine utilities from @money-matters/capability-budgeting.
 * This is the single sanctioned cross-capability import in the monorepo — justified because simulation
 * is a stateless pure-computation layer with zero DB writes.
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
import type { CanAffordVerdictType, OneOffGoalAlternative } from "@money-matters/types";
import { getTenantDateString } from "@money-matters/core";

const getAestDateString = (d: Date = new Date()) => getTenantDateString(d);

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

  // ── 5. UPCOMING BILLS BEFORE NEXT PAYDAY & UNFUNDED SHORTFALL ─────────
  const regularPoolIds = new Set(regularPools.map((p) => p.id));
  const billsDueBeforePayday = pendingExpensesRaw.filter(
    (e) =>
      e.expectedDate >= todayStr &&
      e.expectedDate <= nextPaycheckDateStr
  );

  const poolBillsSumMap = new Map<string, number>();
  let unassignedBillsSum = 0;

  for (const e of billsDueBeforePayday) {
    const amt = parseFloat(e.expectedAmount);
    if (e.poolId && regularPoolIds.has(e.poolId)) {
      poolBillsSumMap.set(e.poolId, (poolBillsSumMap.get(e.poolId) ?? 0) + amt);
    } else {
      unassignedBillsSum += amt;
    }
  }

  // Calculate unfunded shortfall per REGULAR pool (bills due minus current pool balance)
  let unfundedBillsShortfall = unassignedBillsSum;
  for (const [poolId, billsSum] of poolBillsSumMap.entries()) {
    const poolBal = poolBalancesMap[poolId] ?? 0;
    const shortfall = Math.max(0, billsSum - poolBal);
    unfundedBillsShortfall += shortfall;
  }

  const totalBillsBeforePayday = billsDueBeforePayday.reduce(
    (sum, e) => sum + parseFloat(e.expectedAmount),
    0
  );
  // Effective spendable Everyday cash after subtracting unfunded bill shortfalls
  const effectiveSpendable = Math.max(0, everydayBalance - unfundedBillsShortfall);

  // ── 6. PRORATED EVERYDAY SAFE CUSHION (Total Dollars Until Payday) ────
  const everydayMonthlyAllowance = everydayPools.reduce((sum, p) => {
    const amt = parseFloat(p.everydayAllowanceAmount ?? p.targetAmount ?? "0");
    return sum + amt;
  }, 0);
  const dailyAllowance = everydayMonthlyAllowance / 30;
  // 25% of daily target prorated for days until payday; fallback $15 * days if zero allowance configured
  const safeCushionVal =
    dailyAllowance > 0
      ? Math.round(dailyAllowance * 0.25 * daysUntilPayday)
      : Math.round(15 * daysUntilPayday);
  const safeCushion = safeCushionVal.toFixed(2);

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
    const isDay1CashTight = amount > effectiveSpendable;
    const startAdvice = isDay1CashTight
      ? `Start this on or after your next payday (${nextPaycheckDateStr}), as today's remaining cash is needed for current expenses.`
      : undefined;

    // --- 12-Month Projection Setup ---
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

    const baseExpenses: CumulativeProjectionExpenseEvent[] = pendingExpensesRaw.map((e) => ({
      poolId: e.poolId,
      categoryId: e.categoryId,
      dueDate: e.expectedDate,
      amount: parseFloat(e.expectedAmount),
      status: e.status as "PENDING" | "CONFIRMED",
    }));

    // Inject calendar-matched phantom expense events over 12-month horizon
    const phantomExpenses: CumulativeProjectionExpenseEvent[] = [];
    let count = 12;
    if (frequency === "WEEKLY") count = 52;
    else if (frequency === "FORTNIGHTLY") count = 26;
    else if (frequency === "MONTHLY") count = 12;
    else if (frequency === "ANNUALLY") count = 1;

    for (let k = 0; k < count; k++) {
      let d: Date;
      if (frequency === "MONTHLY") {
        d = new Date(today);
        d.setMonth(d.getMonth() + k);
      } else if (frequency === "ANNUALLY") {
        d = new Date(today);
        d.setFullYear(d.getFullYear() + k);
      } else if (frequency === "WEEKLY") {
        d = new Date(today.getTime() + k * 7 * 24 * 60 * 60 * 1000);
      } else {
        // FORTNIGHTLY
        d = new Date(today.getTime() + k * 14 * 24 * 60 * 60 * 1000);
      }

      phantomExpenses.push({
        poolId: phantomBucket.id,
        amount,
        dueDate: getAestDateString(d),
        status: "PENDING",
      });
    }

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
      expenseEvents: baseExpenses,
    });

    // Projection WITH phantom bucket & injected expenses
    const projectionWith = runCumulativeProjection({
      categories: [...engineBuckets, phantomBucket],
      incomeEvents: cumIncomes,
      expenseEvents: [...baseExpenses, ...phantomExpenses],
    });

    // --- CHECK 1: PHANTOM BUCKET DEFICIT (Bills shortfall) ---
    const phantomFinalBal = projectionWith.finalBalances.get(phantomBucket.id) ?? 0;
    if (phantomFinalBal < -1) {
      const totalDeficit = Math.abs(phantomFinalBal);
      return {
        verdict: "HARD_NO",
        shortfall: totalDeficit.toFixed(2),
        horizonMonths: 12,
        rationaleSteps: [
          `Over a 12-month budget forecast, your projected income is insufficient to cover this ${frequency.toLowerCase()} commitment of $${amount.toFixed(2)} ($${monthlyAmount.toFixed(2)}/mo).`,
          `Forecasted shortfall: -$${totalDeficit.toFixed(2)}.`,
          `Your bills are non-negotiable and cannot be compromised.`,
        ],
      };
    }

    // --- CHECK 2: EVERYDAY 80% MINIMUM ALLOWANCE PRESERVATION ---
    const everydayPoolIds = new Set(everydayPools.map((p) => p.id));
    let minEverydayBalance = Infinity;

    for (const step of projectionWith.steps) {
      let everydayAtStep = 0;
      for (const poolId of everydayPoolIds) {
        everydayAtStep += step.balancesAfterExpenses.get(poolId) ?? 0;
      }
      if (everydayAtStep < minEverydayBalance) {
        minEverydayBalance = everydayAtStep;
      }
    }

    // Sum total everyday allocations across projection steps
    let totalEverydayAllocated = 0;
    for (const step of projectionWith.steps) {
      for (const poolId of everydayPoolIds) {
        totalEverydayAllocated += step.allocations.get(poolId)?.proposedAmount ?? 0;
      }
    }

    const expected12MonthEveryday = everydayMonthlyAllowance * 12;
    const minRequiredEveryday = expected12MonthEveryday * 0.8;

    if (minEverydayBalance < 0 || (expected12MonthEveryday > 0 && totalEverydayAllocated < minRequiredEveryday)) {
      const deficit = Math.max(0, minRequiredEveryday - totalEverydayAllocated);
      return {
        verdict: "HARD_NO",
        shortfall: deficit > 0 ? deficit.toFixed(2) : Math.abs(minEverydayBalance).toFixed(2),
        horizonMonths: 12,
        rationaleSteps: [
          `Over a 12-month budget forecast, this ${frequency.toLowerCase()} commitment of $${amount.toFixed(2)} ($${monthlyAmount.toFixed(2)}/mo) would cut into your essential everyday spending below 80% of what is planned.`,
          `Everyday spending essentials must remain protected.`,
        ],
      };
    }

    // --- CHECK 3: GOAL DELAYS ("What Gives") ---
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
        newTargetDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(newDate),
        delayDays,
      });
    }

    if (goalDelays.length > 0) {
      return {
        verdict: "GOAL_DELAYED",
        isAffordable: true,
        goalDelays,
        recurringMonthlyImpact: monthlyAmount.toFixed(2),
        startAdvice,
        rationaleSteps: [
          `New ${frequency.toLowerCase()} commitment of $${amount.toFixed(2)} ($${monthlyAmount.toFixed(2)}/mo) added to your ongoing budget.`,
          `All upcoming bills and essential everyday spending remain 100% protected.`,
          `${goalDelays.length} savings goal(s) will absorb this by adjusting target dates:`,
          ...goalDelays.map(
            (g) =>
              `"${g.goalName}" (${g.isCommitted ? "committed target" : "flexible goal"}): pushed back by ~${g.delayDays} days.`
          ),
          ...(startAdvice ? [startAdvice] : []),
        ],
      };
    }

    // Recurring affordable with zero goal delays
    const remaining = effectiveSpendable - amount;
    return {
      verdict: "SAFE_YES",
      availableCash: everydayBalance.toFixed(2),
      effectiveSpendable: effectiveSpendable.toFixed(2),
      everydayRemaining: remaining.toFixed(2),
      safeCushion,
      daysUntilPayday,
      nextPaydayDate: nextPaycheckDateStr,
      upcomingBillsBeforePayday: totalBillsBeforePayday.toFixed(2),
      startAdvice,
      rationaleSteps: [
        `Recurring ${frequency.toLowerCase()} commitment of $${amount.toFixed(2)} ($${monthlyAmount.toFixed(2)}/mo).`,
        `Your budget forecast shows all bills, savings targets, and everyday spending remain fully funded.`,
        ...(startAdvice ? [startAdvice] : []),
      ],
    };
  }

  // ── 9. ONE-OFF: BILLS RISK CHECK ──────────────────────────────────────
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
        `Net safe-to-spend today after unfunded bills: $${effectiveSpendable.toFixed(2)} — insufficient for $${amount.toFixed(2)}`,
        `Bills are non-negotiable and cannot be spent.`,
      ],
    };
  }

  // ── 10. ONE-OFF: IMMEDIATE AFFORDABILITY CHECK ───────────────────────
  if (amount <= effectiveSpendable) {
    const remaining = effectiveSpendable - amount;
    const everydayRemaining = remaining.toFixed(2);

    if (remaining >= safeCushionVal) {
      return {
        verdict: "SAFE_YES",
        availableCash: everydayBalance.toFixed(2),
        effectiveSpendable: effectiveSpendable.toFixed(2),
        everydayRemaining,
        safeCushion,
        daysUntilPayday,
        nextPaydayDate: nextPaycheckDateStr,
        upcomingBillsBeforePayday: totalBillsBeforePayday.toFixed(2),
        rationaleSteps: [
          `Everyday balance: $${everydayBalance.toFixed(2)}${includePersonal ? " (includes Personal Pools)" : ""}`,
          `Upcoming bills before payday: $${totalBillsBeforePayday.toFixed(2)} (100% protected)`,
          `After purchase: $${everydayRemaining} remaining until payday on ${nextPaycheckDateStr}.`,
          `Comfortably above your recommended safe cushion of $${safeCushion}.`,
        ],
      };
    } else {
      const cushionShortfall = (safeCushionVal - remaining).toFixed(2);
      return {
        verdict: "PACING_TIGHT",
        availableCash: everydayBalance.toFixed(2),
        effectiveSpendable: effectiveSpendable.toFixed(2),
        everydayRemaining,
        safeCushion,
        cushionShortfall,
        daysUntilPayday,
        nextPaydayDate: nextPaycheckDateStr,
        upcomingBillsBeforePayday: totalBillsBeforePayday.toFixed(2),
        rationaleSteps: [
          `Everyday balance: $${everydayBalance.toFixed(2)}`,
          `Upcoming bills before payday: $${totalBillsBeforePayday.toFixed(2)} (100% protected)`,
          `After purchase: $${everydayRemaining} remaining for ${daysUntilPayday} days until payday on ${nextPaycheckDateStr}.`,
          `This leaves you $${cushionShortfall} below your recommended safe cushion ($${safeCushion}).`,
        ],
      };
    }
  }

  // ── 11. ONE-OFF: SHORTFALL TODAY — CHECK SAVINGS GOALS & FUTURE PAYDAYS ─
  const shortfall = amount - effectiveSpendable;

  // Check flexible Savings Goals to see if one can cover the shortfall
  const flexibleGoals = goalPools.filter((p) => !p.isCommitted && (poolBalancesMap[p.id] ?? 0) > 0);
  flexibleGoals.sort((a, b) => (poolBalancesMap[b.id] ?? 0) - (poolBalancesMap[a.id] ?? 0));
  const candidateGoal = flexibleGoals[0] ?? null;

  let goalAlternative: OneOffGoalAlternative | undefined = undefined;
  if (candidateGoal) {
    const goalBal = poolBalancesMap[candidateGoal.id] ?? 0;
    if (goalBal >= shortfall) {
      const poolMonthlyContrib =
        poolCategoryTargetsMap.get(candidateGoal.id) ??
        (candidateGoal.targetAmount ? parseFloat(candidateGoal.targetAmount) / 12 : 0);
      const dailyContrib = poolMonthlyContrib > 0 ? poolMonthlyContrib / 30 : 1;
      const delayDays = Math.max(1, Math.round(shortfall / dailyContrib));

      let newTargetDate: string | null = null;
      if (candidateGoal.targetDate) {
        const origDate = new Date(candidateGoal.targetDate + "T00:00:00+10:00");
        const nDate = new Date(origDate.getTime() + delayDays * 24 * 60 * 60 * 1000);
        newTargetDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(nDate);
      }

      goalAlternative = {
        goalId: candidateGoal.id,
        goalName: candidateGoal.name,
        availableGoalBalance: goalBal.toFixed(2),
        shortfallCovered: shortfall.toFixed(2),
        delayDays,
        newTargetDate,
      };
    }
  }

  // Run cumulative projection to find earliest paycycle where Everyday cash accumulates enough
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

    let daysInStep = 14;
    if (i < projection.steps.length - 1) {
      const tCurr = new Date(step.date + "T00:00:00").getTime();
      const tNext = new Date(projection.steps[i + 1].date + "T00:00:00").getTime();
      daysInStep = Math.max(1, Math.round((tNext - tCurr) / (1000 * 60 * 60 * 24)));
    }
    const stepCushion = dailyAllowance > 0 ? dailyAllowance * 0.25 * daysInStep : 15 * daysInStep;

    if (everydayAtStep - amount >= stepCushion) {
      const paycyclesAway = i + 1;
      const ordinal = ordinals[i] ?? "th";
      const rationaleSteps = [
        `Current safe-to-spend Everyday cash: $${effectiveSpendable.toFixed(2)} (shortfall: -$${shortfall.toFixed(2)}).`,
        `By your ${paycyclesAway === 1 ? "next" : `${paycyclesAway}${ordinal}`} paycycle (${step.date}), Everyday balance will reach ~$${everydayAtStep.toFixed(2)}, leaving enough surplus after purchase with your safe cushion intact.`,
      ];

      if (goalAlternative) {
        rationaleSteps.push(
          `Alternatively, cover the $${shortfall.toFixed(2)} gap today using your "${goalAlternative.goalName}" goal (pushes target date back by ~${goalAlternative.delayDays} days).`
        );
      }

      return {
        verdict: "WAIT_FOR_PAYCYCLE",
        canAffordAt: step.date,
        paycyclesAway,
        projectedEverydayAtThatDate: everydayAtStep.toFixed(2),
        shortfallToday: shortfall.toFixed(2),
        goalAlternative,
        rationaleSteps,
      };
    }
  }

  // ── 12. HARD_NO: 12-month horizon exhausted ───────────────────────────
  return {
    verdict: "HARD_NO",
    shortfall: shortfall.toFixed(2),
    horizonMonths: 12,
    rationaleSteps: [
      `Current safe-to-spend Everyday cash: $${effectiveSpendable.toFixed(2)} (shortfall: -$${shortfall.toFixed(2)}).`,
      `Across your 12-month budget forecast, projected income does not accumulate enough Everyday surplus to cover $${amount.toFixed(2)}.`,
      `Consider setting this up as a dedicated savings goal.`,
    ],
  };
}
