import type {
  CanAffordVerdictType,
  OneOffGoalAlternative,
  ProjectionExpenseEvent,
  ProjectionIncomeEvent,
} from "@money-matters/types";
import type { OneOffSimulationParams } from "./simulation-types.js";

export function simulateOneOffPurchase(
  params: OneOffSimulationParams
): CanAffordVerdictType {
  const {
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
    projectionEngine,
    timezone,
  } = params;

  // ── 1. BILLS RISK CHECK ──────────────────────────────────────
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

  // ── 2. IMMEDIATE AFFORDABILITY CHECK ───────────────────────
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

  // ── 3. SHORTFALL TODAY — CHECK SAVINGS GOALS & FUTURE PAYDAYS ─
  const shortfall = amount - effectiveSpendable;

  const flexibleGoals = goalEnvelopes.filter((p) => !p.isPriority && (envelopeBalancesMap[p.id] ?? 0) > 0);
  flexibleGoals.sort((a, b) => (envelopeBalancesMap[b.id] ?? 0) - (envelopeBalancesMap[a.id] ?? 0));
  const candidateGoal = flexibleGoals[0] ?? null;

  let goalAlternative: OneOffGoalAlternative | undefined = undefined;
  if (candidateGoal) {
    const goalBal = envelopeBalancesMap[candidateGoal.id] ?? 0;
    if (goalBal >= shortfall) {
      const poolMonthlyContrib =
        candidateGoal.fundingMode === "RECURRING"
          ? parseFloat(candidateGoal.targetAmount || "0")
          : (candidateGoal.monthlyAmount ? parseFloat(candidateGoal.monthlyAmount) : (candidateGoal.targetAmount ? parseFloat(candidateGoal.targetAmount) / 12 : 0));
      const dailyContrib = poolMonthlyContrib > 0 ? poolMonthlyContrib / 30 : 1;
      const delayDays = Math.max(1, Math.round(shortfall / dailyContrib));

      let newTargetDate: string | null = null;
      if (candidateGoal.endDate) {
        const origDate = new Date(candidateGoal.endDate + "T00:00:00Z");
        const nDate = new Date(origDate.getTime() + delayDays * 24 * 60 * 60 * 1000);
        newTargetDate = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(nDate);
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
  const cumExpenses: ProjectionExpenseEvent[] = pendingExpensesRaw.map((e) => ({
    poolId: e.envelopeId,
    dueDate: e.expectedDate,
    amount: parseFloat(e.expectedAmount),
    status: e.status as "PENDING" | "CONFIRMED",
  }));

  const cumIncomes: ProjectionIncomeEvent[] = sortedIncomes.map((e) => ({
    id: e.id,
    sourceName: e.sourceName,
    expectedDate: e.expectedDate,
    expectedAmount: parseFloat(e.expectedAmount),
    actualAmount: e.actualAmount ? parseFloat(e.actualAmount) : null,
    status: e.status as "PENDING" | "CONFIRMED" | "DRAFT" | "REVIEWED",
    rrule: e.rrule,
  }));

  const projection = projectionEngine({
    categories: engineBuckets,
    incomeEvents: cumIncomes,
    expenseEvents: cumExpenses,
  });

  const everydayEnvelopeIds = new Set<string>(everydayEnvelopes.map((p) => p.id));
  const surplusEnvelope = visibleEnvelopes.find((p) => p.isSurplusTarget);
  const ordinals = ["st", "nd", "rd"];

  for (let i = 0; i < projection.steps.length; i++) {
    const step = projection.steps[i];

    let daysInStep = 14;
    if (i < projection.steps.length - 1) {
      const tCurr = new Date(step.date + "T00:00:00").getTime();
      const tNext = new Date(projection.steps[i + 1].date + "T00:00:00").getTime();
      daysInStep = Math.max(1, Math.round((tNext - tCurr) / (1000 * 60 * 60 * 24)));
    }
    const stepCushion = dailyAllowance > 0 ? dailyAllowance * 0.25 * daysInStep : 15 * daysInStep;

    const paycyclesAway = i + 1;
    const ordinal = ordinals[i] ?? "th";

    // TIER 1: Check fresh discretionary capacity injected on this payday
    let freshEveryday = 0;
    for (const envId of everydayEnvelopeIds) {
      freshEveryday += step.allocations.get(envId)?.proposedAmount ?? 0;
    }
    const freshSurplus = surplusEnvelope ? (step.allocations.get(surplusEnvelope.id)?.proposedAmount ?? 0) : 0;
    const freshDiscretionary = freshEveryday + freshSurplus;

    if (freshDiscretionary - amount >= stepCushion) {
      const rationaleSteps = [
        `Current safe-to-spend Everyday cash: $${effectiveSpendable.toFixed(2)} (shortfall: -$${shortfall.toFixed(2)}).`,
        `By your ${paycyclesAway === 1 ? "next" : `${paycyclesAway}${ordinal}`} paycycle (${step.date}), your incoming paycheck provides enough safe discretionary cash ($${freshDiscretionary.toFixed(2)}) to cover this purchase while keeping all bills and living essentials 100% protected.`,
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
        projectedEverydayAtThatDate: freshDiscretionary.toFixed(2),
        shortfallToday: shortfall.toFixed(2),
        goalAlternative,
        rationaleSteps,
      };
    }

    // TIER 2: Check accumulated Surplus savings
    const accumulatedSurplus = surplusEnvelope ? (step.balancesAfterExpenses.get(surplusEnvelope.id) ?? 0) : 0;
    if (accumulatedSurplus >= amount) {
      const rationaleSteps = [
        `Current safe-to-spend Everyday cash: $${effectiveSpendable.toFixed(2)} (shortfall: -$${shortfall.toFixed(2)}).`,
        `By your ${paycyclesAway === 1 ? "next" : `${paycyclesAway}${ordinal}`} paycycle (${step.date}), your accumulated savings in "${surplusEnvelope?.name}" will reach $${accumulatedSurplus.toFixed(2)}, allowing you to safely purchase this without touching everyday living or risking bills.`,
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
        projectedEverydayAtThatDate: accumulatedSurplus.toFixed(2),
        shortfallToday: shortfall.toFixed(2),
        goalAlternative,
        rationaleSteps,
      };
    }
  }

  // ── 4. HARD_NO: 12-month horizon exhausted ───────────────────────────
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
