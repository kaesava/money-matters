import { runAllocationEngine, EngineBucket, AllocationLine } from "./allocation-engine.js";

export interface CumulativeProjectionIncomeEvent {
  id: string;
  sourceName?: string | null;
  name?: string | null;
  expectedDate: string; // YYYY-MM-DD
  expectedAmount: number;
  actualAmount?: number | null;
  status: "PENDING" | "CONFIRMED" | "DRAFT" | "REVIEWED";
  rrule?: string | null;
  userId?: string;
  isPrivate?: boolean;
}

export interface CumulativeProjectionExpenseEvent {
  categoryId?: string | null;
  poolId?: string | null;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: "PENDING" | "CONFIRMED";
}

export interface SavedPlanLineItem {
  poolId: string;
  proposedAmount: number;
  reasoning?: string | null;
}

export interface CumulativeProjectionInput {
  categories: EngineBucket[];
  incomeEvents: CumulativeProjectionIncomeEvent[];
  expenseEvents?: CumulativeProjectionExpenseEvent[];
  // Saved PENDING plan lines per income event (incomeEventId -> SavedPlanLineItem[])
  savedPlans?: Record<string, SavedPlanLineItem[]>;
  // Temporary cell overrides from Matrix grid (e.g. `${incomeEventId}_${categoryId}` -> amount)
  cellOverrides?: Record<string, number>;
  currentUserId?: string;
}

export interface CumulativeAllocationDetail {
  proposedAmount: number;
  reasoning: string;
  isOverride: boolean;
}

export interface CumulativeProjectionTimelineStep {
  incomeEvent: CumulativeProjectionIncomeEvent;
  date: string;
  totalIncome: number;
  balancesBeforeAlloc: Map<string, number>;
  allocations: Map<string, CumulativeAllocationDetail>;
  balancesAfterAlloc: Map<string, number>;
  deductedExpenses: Array<{ bucketId: string; amount: number; dueDate: string }>;
  balancesAfterExpenses: Map<string, number>;
  minProjectedBalances: Map<string, number>;
}

export interface CumulativeProjectionOutput {
  steps: CumulativeProjectionTimelineStep[];
  finalBalances: Map<string, number>;
  getStepForEvent(incomeEventId: string): CumulativeProjectionTimelineStep | undefined;
}

/**
 * Runs a deterministic cumulative cascading projection across all pending income events and scheduled expenses.
 * This simulates balance progression sequentially from the earliest unconfirmed income event through the timeline.
 */
export function runCumulativeProjection(input: CumulativeProjectionInput): CumulativeProjectionOutput {
  const cellOverrides = input.cellOverrides ?? {};
  const savedPlans = input.savedPlans ?? {};

  // 1. Filter and sort income events chronologically (expectedDate ASC, then id ASC for same-day determinism)
  const upcomingIncomes = [...input.incomeEvents]
    .filter((e) => e && Boolean(e.expectedDate) && String(e.expectedDate).length >= 10)
    .sort((a, b) => {
      const tA = new Date(a.expectedDate + "T00:00:00").getTime();
      const tB = new Date(b.expectedDate + "T00:00:00").getTime();
      const diff = (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });

  // 2. Filter and sort pending scheduled expenses
  const upcomingExpenses = (input.expenseEvents ?? [])
    .filter((e) => e && e.status === "PENDING" && Boolean(e.dueDate) && String(e.dueDate).length >= 10)
    .sort((a, b) => {
      const tA = new Date(a.dueDate + "T00:00:00").getTime();
      const tB = new Date(b.dueDate + "T00:00:00").getTime();
      return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
    });

  // 3. Initialize running balances per bucket
  const runningBalances = new Map<string, number>();
  for (const cat of input.categories) {
    runningBalances.set(cat.id, cat.currentBalance || 0);
  }

  const steps: CumulativeProjectionTimelineStep[] = [];

  // 4. Sequential Simulation Loop
  for (let i = 0; i < upcomingIncomes.length; i++) {
    const evt = upcomingIncomes[i];
    const totalIncome = evt.actualAmount ?? evt.expectedAmount;

    // Snapshot balances BEFORE this income allocation
    const balancesBeforeAlloc = new Map(runningBalances);

    // Determine frequency days from rrule if present
    let freqDays = 14;
    if (evt.rrule) {
      const upper = evt.rrule.toUpperCase();
      if (upper.includes("FREQ=MONTHLY")) freqDays = 30;
      else if (upper.includes("FREQ=WEEKLY") && !upper.includes("INTERVAL=2")) freqDays = 7;
      else if (upper.includes("FREQ=YEARLY")) freqDays = 365;
    }

    let daysUntilNext = 30;
    let nextDateObj: Date | undefined;
    if (i < upcomingIncomes.length - 1) {
      nextDateObj = new Date(upcomingIncomes[i + 1].expectedDate + "T00:00:00");
      const currDateObj = new Date(evt.expectedDate + "T00:00:00");
      daysUntilNext = Math.max(1, Math.round((nextDateObj.getTime() - currDateObj.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Pre-compute expense deductions up until the next payday date
    const nextCutoffDate = i < upcomingIncomes.length - 1 ? upcomingIncomes[i + 1].expectedDate : "9999-12-31";

    const relevantExpenses = upcomingExpenses.filter((e) => {
      const matchCat = e.categoryId || e.poolId;
      if (!matchCat) return false;
      if (i === 0) {
        return e.dueDate < nextCutoffDate;
      }
      return e.dueDate >= evt.expectedDate && e.dueDate < nextCutoffDate;
    });

    const allocations = new Map<string, CumulativeAllocationDetail>();

    // Check if this event has explicit saved plan lines, is confirmed, or has direct cell overrides
    const eventSavedPlan = savedPlans[evt.id];
    const isConfirmed = evt.status === "CONFIRMED";
    const hasAnyCellOverride = input.categories.some((cat) => typeof cellOverrides[`${evt.id}_${cat.id}`] === "number");

    if ((eventSavedPlan && eventSavedPlan.length > 0) || (isConfirmed && hasAnyCellOverride)) {
      // Use saved/confirmed plan lines or cellOverrides
      for (const cat of input.categories) {
        const savedLine = eventSavedPlan?.find((l) => l.poolId === cat.id);
        const overrideKey = `${evt.id}_${cat.id}`;
        const val = typeof cellOverrides[overrideKey] === "number"
          ? cellOverrides[overrideKey]
          : (savedLine?.proposedAmount ?? 0);
        const defaultReasoning = isConfirmed ? "Confirmed allocation plan" : "Custom saved allocation plan";
        const reasoning = savedLine?.reasoning?.trim() || defaultReasoning;

        allocations.set(cat.id, {
          proposedAmount: val,
          reasoning,
          isOverride: true,
        });
      }
    } else {
      // Run allocation engine against current simulated running balances and upcoming expenses
      const currentBuckets: EngineBucket[] = input.categories.map((c) => ({
        ...c,
        currentBalance: runningBalances.get(c.id) ?? (c.currentBalance || 0),
      }));

      const engineResult = runAllocationEngine({
        incomeAmount: totalIncome,
        buckets: currentBuckets,
        paycheckDate: new Date(evt.expectedDate + "T00:00:00"),
        paycheckFrequencyDays: freqDays,
        daysUntilNextIncome: daysUntilNext,
        nextPaycheckDate: nextDateObj,
        upcomingExpenses: relevantExpenses.map((e) => ({
          poolId: e.poolId || e.categoryId,
          categoryId: e.categoryId,
          amount: e.amount,
          dueDate: e.dueDate,
        })),
      });

      const engineLinesMap = new Map<string, AllocationLine>();
      for (const line of engineResult.lines) {
        engineLinesMap.set(line.bucketId, line);
      }

      for (const cat of input.categories) {
        const overrideKey = `${evt.id}_${cat.id}`;
        const hasDirectOverride = typeof cellOverrides[overrideKey] === "number";
        const fallbackKey =
          cat.type === "EVERYDAY" ? `${evt.id}_pool_everyday` : cat.type === "REGULAR" ? `${evt.id}_pool_bills` : null;
        const hasFallbackOverride = fallbackKey ? typeof cellOverrides[fallbackKey] === "number" : false;

        const hasOverride = hasDirectOverride || hasFallbackOverride;
        const engineLine = engineLinesMap.get(cat.id);
        const proposedAmount = hasDirectOverride
          ? cellOverrides[overrideKey]
          : hasFallbackOverride && fallbackKey
          ? cellOverrides[fallbackKey]
          : engineLine?.proposedAmount ?? 0;

        allocations.set(cat.id, {
          proposedAmount: Number(proposedAmount.toFixed(2)),
          reasoning: engineLine?.reasoning ?? "Automatic allocation",
          isOverride: hasOverride,
        });
      }
    }

    // Apply allocations to running balances
    const balancesAfterAlloc = new Map<string, number>();
    for (const cat of input.categories) {
      const startBal = runningBalances.get(cat.id) ?? 0;
      const alloc = allocations.get(cat.id)?.proposedAmount ?? 0;
      const afterAlloc = Number((startBal + alloc).toFixed(2));
      balancesAfterAlloc.set(cat.id, afterAlloc);
      runningBalances.set(cat.id, afterAlloc);
    }

    const deductedExpenses: Array<{ bucketId: string; amount: number; dueDate: string }> = [];

    for (const exp of relevantExpenses) {
      const targetBucketId = exp.categoryId || exp.poolId;
      if (!targetBucketId) continue;
      deductedExpenses.push({
        bucketId: targetBucketId,
        amount: exp.amount,
        dueDate: exp.dueDate,
      });

      const currBal = runningBalances.get(targetBucketId) ?? 0;
      runningBalances.set(targetBucketId, Number((currBal - exp.amount).toFixed(2)));
    }

    // 1. Pro-Rata Burn for EVERYDAY pools (assumed discretionary spending over daysUntilNext)
    for (const cat of input.categories) {
      if (cat.type === "EVERYDAY") {
        const monthlyTarget = cat.monthlyAmount ?? cat.targetAmount ?? cat.everydayAllowanceAmount ?? 0;
        if (monthlyTarget > 0) {
          const burnAmount = Number(((monthlyTarget / 30) * daysUntilNext).toFixed(2));
          const curBal = runningBalances.get(cat.id) ?? 0;
          runningBalances.set(cat.id, Math.max(0, Number((curBal - burnAmount).toFixed(2))));
        }
      }
    }

    // 2. Anti-Runaway Cap for REGULAR pools (prevents infinite build-up if expenses are unscheduled)
    // Conserves household wealth by sweeping trimmed excess directly into designated Surplus Target
    let totalTrimmedExcess = 0;
    for (const cat of input.categories) {
      if (cat.type === "REGULAR") {
        const monthlyTarget = cat.monthlyAmount ?? cat.targetAmount ?? 0;
        const cap = monthlyTarget * 1.5;
        const curBal = runningBalances.get(cat.id) ?? 0;
        if (monthlyTarget > 0 && curBal > cap) {
          totalTrimmedExcess += Number((curBal - cap).toFixed(2));
          runningBalances.set(cat.id, Number(cap.toFixed(2)));
        }
      }
    }

    if (totalTrimmedExcess > 0) {
      const surplusBucket = input.categories.find((c) => c.isSurplusTarget) || input.categories.find((c) => c.type === "GOAL");
      if (surplusBucket) {
        const curSurplus = runningBalances.get(surplusBucket.id) ?? 0;
        runningBalances.set(surplusBucket.id, Number((curSurplus + totalTrimmedExcess).toFixed(2)));
      }
    }

    // Snapshot balances AFTER expenses and min projected balance
    const balancesAfterExpenses = new Map<string, number>();
    const minProjectedBalances = new Map<string, number>();

    for (const cat of input.categories) {
      const afterAlloc = balancesAfterAlloc.get(cat.id) ?? 0;
      const afterExp = runningBalances.get(cat.id) ?? 0;

      balancesAfterExpenses.set(cat.id, Number(afterExp.toFixed(2)));
      minProjectedBalances.set(cat.id, Number(Math.min(afterAlloc, afterExp).toFixed(2)));
    }

    steps.push({
      incomeEvent: evt,
      date: evt.expectedDate,
      totalIncome,
      balancesBeforeAlloc,
      allocations,
      balancesAfterAlloc,
      deductedExpenses,
      balancesAfterExpenses,
      minProjectedBalances,
    });
  }

  return {
    steps,
    finalBalances: new Map(runningBalances),
    getStepForEvent(incomeEventId: string) {
      return steps.find((s) => s.incomeEvent.id === incomeEventId);
    },
  };
}
