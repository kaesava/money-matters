import type {
  CanAffordVerdictType,
  ProjectionEngineBucket,
  ProjectionExpenseEvent,
  ProjectionIncomeEvent,
} from "@money-matters/types";
import { getTenantDateString } from "@money-matters/core";
import { toMonthlyAmount } from "../can-afford-simulation.query.js";
import type { RecurringSimulationParams } from "./simulation-types.js";

export function simulateRecurringCommitment(
  params: RecurringSimulationParams
): CanAffordVerdictType {
  const {
    amount,
    frequency,
    itemName,
    effectiveSpendable,
    everydayBalance,
    safeCushion,
    daysUntilPayday,
    nextPaycheckDateStr,
    totalBillsBeforePayday,
    goalEnvelopes,
    everydayEnvelopes,
    engineBuckets,
    pendingExpensesRaw,
    sortedIncomes,
    projectionEngine,
    today,
    timezone,
  } = params;

  const monthlyAmount = toMonthlyAmount(amount, frequency);
  const isDay1CashTight = amount > effectiveSpendable;
  const startAdvice = isDay1CashTight
    ? `Start this on or after your next payday (${nextPaycheckDateStr}), as today's remaining cash is needed for current expenses.`
    : undefined;

  // --- 12-Month Projection Setup ---
  const phantomBucket: ProjectionEngineBucket = {
    id: `__phantom_recurring__`,
    name: itemName ?? "New Recurring Commitment",
    type: "REGULAR",
    isCommitted: false,
    isSurplusTarget: false,
    monthlyAmount,
    targetAmount: null,
    targetDate: null,
    currentBalance: 0,
    isPrivate: false,
  };

  const baseExpenses: ProjectionExpenseEvent[] = pendingExpensesRaw.map((e) => ({
    poolId: e.envelopeId,
    dueDate: e.expectedDate,
    amount: parseFloat(e.expectedAmount),
    status: e.status as "PENDING" | "CONFIRMED",
  }));

  // Inject calendar-matched phantom expense events over 12-month horizon
  const phantomExpenses: ProjectionExpenseEvent[] = [];
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
      dueDate: getTenantDateString(d, { timezone }),
      status: "PENDING",
    });
  }

  const cumIncomes: ProjectionIncomeEvent[] = sortedIncomes.map((e) => ({
    id: e.id,
    sourceName: e.sourceName,
    expectedDate: e.expectedDate,
    expectedAmount: parseFloat(e.expectedAmount),
    actualAmount: e.actualAmount ? parseFloat(e.actualAmount) : null,
    status: e.status as "PENDING" | "CONFIRMED" | "DRAFT" | "REVIEWED",
    rrule: e.rrule,
  }));

  // Projection WITHOUT phantom — baseline goal final balances
  const projectionWithout = projectionEngine({
    categories: engineBuckets,
    incomeEvents: cumIncomes,
    expenseEvents: baseExpenses,
  });

  // Projection WITH phantom bucket & injected expenses
  const projectionWith = projectionEngine({
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
  const everydayEnvelopeIds = new Set<string>(everydayEnvelopes.map((p) => p.id));
  let minEverydayBalance = Infinity;

  for (const step of projectionWith.steps) {
    let everydayAtStep = 0;
    for (const envId of everydayEnvelopeIds) {
      everydayAtStep += step.balancesAfterExpenses.get(envId) ?? 0;
    }
    if (everydayAtStep < minEverydayBalance) {
      minEverydayBalance = everydayAtStep;
    }
  }

  // Sum total everyday allocations across projection steps
  let totalEverydayAllocated = 0;
  for (const step of projectionWith.steps) {
    for (const envId of everydayEnvelopeIds) {
      totalEverydayAllocated += step.allocations.get(envId)?.proposedAmount ?? 0;
    }
  }

  const everydayMonthlyAllowance = everydayEnvelopes.reduce((sum, e) => {
    const amt = parseFloat(e.monthlyAmount ?? e.enteredAmount ?? e.targetAmount ?? "0");
    return sum + amt;
  }, 0);
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

  for (const pool of goalEnvelopes) {
    if (!pool.targetAmount) continue;

    const originalFinalBalance = projectionWithout.finalBalances.get(pool.id) ?? 0;
    const newFinalBalance = projectionWith.finalBalances.get(pool.id) ?? 0;
    const balanceDrop = originalFinalBalance - newFinalBalance;
    if (balanceDrop <= 0.01) continue;

    const poolMonthlyContrib =
      pool.goalMode === "ONGOING"
        ? parseFloat(pool.targetAmount)
        : (pool.monthlyAmount ? parseFloat(pool.monthlyAmount) : parseFloat(pool.targetAmount) / 12);
    const dailyContrib = poolMonthlyContrib > 0 ? poolMonthlyContrib / 30 : 1;
    const delayDays = Math.max(1, Math.round(balanceDrop / dailyContrib));

    let newDateStr: string | null = null;
    if (pool.endDate) {
      const originalDate = new Date(pool.endDate + "T00:00:00Z");
      const newDate = new Date(originalDate.getTime() + delayDays * 24 * 60 * 60 * 1000);
      newDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(newDate);
    }

    goalDelays.push({
      goalId: pool.id,
      goalName: pool.name,
      isCommitted: pool.isCommitted ?? false,
      originalTargetDate: pool.endDate,
      newTargetDate: newDateStr,
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
