import { runAllocationEngine, EngineBucket, AllocationLine } from "./allocation-engine.js";
import { isBillsBucket, isGoalBucket, isEverydayBucket } from "./envelope-engine-mapper.js";

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
  savedPlans?: Record<string, SavedPlanLineItem[]>;
  cellOverrides?: Record<string, number>;
  currentUserId?: string;
  timezone?: string;
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

function parseFreqDays(rrule?: string | null): number {
  if (!rrule) return 14;
  const upper = rrule.toUpperCase();
  if (upper.includes("FREQ=MONTHLY")) return 30;
  if (upper.includes("FREQ=WEEKLY") && !upper.includes("INTERVAL=2")) return 7;
  if (upper.includes("FREQ=YEARLY")) return 365;
  return 14;
}

export function runCumulativeProjection(input: CumulativeProjectionInput): CumulativeProjectionOutput {
  const cellOverrides = input.cellOverrides ?? {};
  const savedPlans = input.savedPlans ?? {};

  const upcomingIncomes = [...input.incomeEvents]
    .filter((e) => e && Boolean(e.expectedDate) && String(e.expectedDate).length >= 10)
    .sort((a, b) => {
      const diff = new Date(a.expectedDate + "T00:00:00").getTime() - new Date(b.expectedDate + "T00:00:00").getTime();
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });

  const upcomingExpenses = (input.expenseEvents ?? [])
    .filter((e) => e && e.status === "PENDING" && Boolean(e.dueDate) && String(e.dueDate).length >= 10)
    .sort((a, b) => new Date(a.dueDate + "T00:00:00").getTime() - new Date(b.dueDate + "T00:00:00").getTime());

  const runningBalances = new Map<string, number>();
  for (const cat of input.categories) {
    runningBalances.set(cat.id, cat.currentBalance || 0);
  }

  const steps: CumulativeProjectionTimelineStep[] = [];

  for (let i = 0; i < upcomingIncomes.length; i++) {
    const evt = upcomingIncomes[i];
    const totalIncome = evt.actualAmount ?? evt.expectedAmount;
    const balancesBeforeAlloc = new Map(runningBalances);
    const freqDays = parseFreqDays(evt.rrule);

    let daysUntilNext = 30;
    let nextDateObj: Date | undefined;
    if (i < upcomingIncomes.length - 1) {
      nextDateObj = new Date(upcomingIncomes[i + 1].expectedDate + "T00:00:00");
      const currDateObj = new Date(evt.expectedDate + "T00:00:00");
      daysUntilNext = Math.max(1, Math.round((nextDateObj.getTime() - currDateObj.getTime()) / (1000 * 60 * 60 * 24)));
    }

    let nextCutoffDate: string;
    if (i < upcomingIncomes.length - 1) {
      nextCutoffDate = upcomingIncomes[i + 1].expectedDate;
    } else {
      const lastEndTime = new Date(evt.expectedDate + "T00:00:00").getTime() + freqDays * 24 * 60 * 60 * 1000;
      nextCutoffDate = new Date(lastEndTime).toISOString().slice(0, 10);
    }

    const relevantExpenses = upcomingExpenses.filter((e) => {
      const matchCat = e.categoryId || e.poolId;
      if (!matchCat) return false;
      return i === 0 ? e.dueDate < nextCutoffDate : e.dueDate >= evt.expectedDate && e.dueDate < nextCutoffDate;
    });

    const allocations = new Map<string, CumulativeAllocationDetail>();
    const eventSavedPlan = savedPlans[evt.id];
    const isConfirmed = evt.status === "CONFIRMED";
    const hasAnyCellOverride = input.categories.some((cat) => typeof cellOverrides[`${evt.id}_${cat.id}`] === "number");

    if ((eventSavedPlan && eventSavedPlan.length > 0) || (isConfirmed && hasAnyCellOverride)) {
      for (const cat of input.categories) {
        const savedLine = eventSavedPlan?.find((l) => l.poolId === cat.id);
        const overrideKey = `${evt.id}_${cat.id}`;
        const val = typeof cellOverrides[overrideKey] === "number" ? cellOverrides[overrideKey] : (savedLine?.proposedAmount ?? 0);
        allocations.set(cat.id, {
          proposedAmount: val,
          reasoning: savedLine?.reasoning?.trim() || (isConfirmed ? "Confirmed allocation plan" : "Custom saved allocation plan"),
          isOverride: true,
        });
      }
    } else {
      const currentBuckets = input.categories.map((c) => ({
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
        timezone: input.timezone,
        upcomingExpenses: relevantExpenses.map((e) => ({
          poolId: e.poolId || e.categoryId,
          categoryId: e.categoryId,
          amount: e.amount,
          dueDate: e.dueDate,
        })),
      });

      const engineLinesMap = new Map<string, AllocationLine>(engineResult.lines.map((l) => [l.bucketId, l]));

      for (const cat of input.categories) {
        const overrideKey = `${evt.id}_${cat.id}`;
        const fallbackKey = isEverydayBucket(cat) ? `${evt.id}_pool_everyday` : isBillsBucket(cat) ? `${evt.id}_pool_bills` : null;
        const hasDirect = typeof cellOverrides[overrideKey] === "number";
        const hasFallback = fallbackKey ? typeof cellOverrides[fallbackKey] === "number" : false;
        const proposedAmount = hasDirect ? cellOverrides[overrideKey] : hasFallback && fallbackKey ? cellOverrides[fallbackKey] : engineLinesMap.get(cat.id)?.proposedAmount ?? 0;

        allocations.set(cat.id, {
          proposedAmount: Number(proposedAmount.toFixed(2)),
          reasoning: engineLinesMap.get(cat.id)?.reasoning ?? "Automatic allocation",
          isOverride: hasDirect || hasFallback,
        });
      }
    }

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
      const targetId = exp.categoryId || exp.poolId;
      if (!targetId) continue;
      deductedExpenses.push({ bucketId: targetId, amount: exp.amount, dueDate: exp.dueDate });
      const curBal = runningBalances.get(targetId) ?? 0;
      runningBalances.set(targetId, Number((curBal - exp.amount).toFixed(2)));
    }

    for (const cat of input.categories) {
      if (isEverydayBucket(cat)) {
        const monthlyTarget = cat.monthlyAmount ?? cat.targetAmount ?? 0;
        const floor = cat.safetyBufferFloor ?? 0;
        if (monthlyTarget > 0) {
          const burnAmount = Number((((monthlyTarget * 12) / 365) * daysUntilNext).toFixed(2));
          const explicitExp = deductedExpenses.filter((d) => d.bucketId === cat.id).reduce((s, e) => s + e.amount, 0);
          const netBurn = Math.max(0, Number((burnAmount - explicitExp).toFixed(2)));
          const curBal = runningBalances.get(cat.id) ?? 0;
          runningBalances.set(cat.id, Math.max(floor, Number((curBal - netBurn).toFixed(2))));
        }
      }
    }

    let totalTrimmedExcess = 0;
    for (const cat of input.categories) {
      if (isBillsBucket(cat)) {
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
      const surplusBucket = input.categories.find((c) => c.isSurplusTarget) || input.categories.find(isGoalBucket);
      if (surplusBucket) {
        const curSurplus = runningBalances.get(surplusBucket.id) ?? 0;
        runningBalances.set(surplusBucket.id, Number((curSurplus + totalTrimmedExcess).toFixed(2)));
      }
    }

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
    getStepForEvent: (id) => steps.find((s) => s.incomeEvent.id === id),
  };
}
