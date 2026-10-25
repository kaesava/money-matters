import { EnvelopeType } from "@money-matters/types";

export type BucketType = EnvelopeType | "REGULAR" | "GOAL";

export interface UpcomingExpenseItem {
  id?: string;
  envelopeId?: string | null;
  poolId?: string | null;
  categoryId?: string | null;
  name?: string;
  amount: number;
  dueDate: string;
  isEssential?: boolean;
}

export interface EngineBucket {
  id: string;
  name: string;
  type: BucketType;
  envelopeType?: EnvelopeType;
  userId?: string;
  isPrivate?: boolean;
  isEssential?: boolean;
  isCommitted?: boolean;
  isSurplusTarget?: boolean;
  monthlyAmount?: number | null;
  targetAmount?: number | null;
  safetyBufferFloor?: number | null;
  goalMode?: "TARGET_DATE" | "ONGOING" | null;
  targetDate?: string | null;
  dueDate?: string | null;
  currentBalance: number;
}

export interface AllocationLine {
  bucketId: string;
  bucketName: string;
  proposedAmount: number;
  reasoning: string;
}

export interface AllocationEngineInput {
  incomeAmount: number;
  incomeUserId?: string;
  incomeType?: "SALARIED" | "IRREGULAR";
  runwayDays?: number;
  buckets: EngineBucket[];
  paycheckDate: Date;
  paycheckFrequencyDays: number;
  daysUntilNextIncome?: number;
  nextPaycheckDate?: Date;
  dueBufferDays?: number;
  upcomingExpenses?: UpcomingExpenseItem[];
  sweepEverydayLeftover?: boolean;
  everydayLeftoverReported?: Record<string, number>;
  currencySymbol?: string;
}

export interface AllocationEngineOutput {
  status: "OK" | "INSUFFICIENT";
  lines: AllocationLine[];
  unallocatedAmount: number;
}

function toCents(amount: number): number {
  return Math.round((amount || 0) * 100);
}

function toDollars(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function isBillsBucket(b: EngineBucket): boolean {
  return b.type === "SCHEDULED_BILL" || b.type === "FLEXIBLE_BILL" || b.type === "REGULAR";
}

function isGoalBucket(b: EngineBucket): boolean {
  return b.type === "TARGET_GOAL" || b.type === "ONGOING_GOAL" || b.type === "GOAL";
}

export function runAllocationEngine(input: AllocationEngineInput): AllocationEngineOutput {
  let remainingCents = toCents(Math.max(0, input.incomeAmount || 0));
  const linesMap = new Map<string, { bucketName: string; amountCents: number; reasonings: string[] }>();

  for (const b of input.buckets) {
    linesMap.set(b.id, {
      bucketName: b.name,
      amountCents: 0,
      reasonings: [],
    });
  }

  const isIrregular = input.incomeType === "IRREGULAR";
  const effectiveRunwayDays = input.runwayDays ?? 30;
  const daysGap = isIrregular ? effectiveRunwayDays : (input.daysUntilNextIncome ?? input.paycheckFrequencyDays);
  const paychecksPerYear = Math.max(1, Math.round(365 / input.paycheckFrequencyDays));

  let cycleFactor = (12 * daysGap) / 365;
  if (!isIrregular) {
    if (input.paycheckFrequencyDays === 14 || daysGap === 14) {
      cycleFactor = 12 / 26;
    } else if (input.paycheckFrequencyDays === 7 || daysGap === 7) {
      cycleFactor = 12 / 52;
    } else if (input.paycheckFrequencyDays >= 28 && input.paycheckFrequencyDays <= 31) {
      cycleFactor = 1.0;
    }
  }

  const bufferDays = input.dueBufferDays ?? 3;
  const baseNextCutoffTime = input.nextPaycheckDate
    ? input.nextPaycheckDate.getTime()
    : input.paycheckDate.getTime() + daysGap * 24 * 60 * 60 * 1000;

  const bufferedCutoffTime = baseNextCutoffTime + bufferDays * 24 * 60 * 60 * 1000;
  const bufferedCutoffDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date(bufferedCutoffTime));

  const upcomingExpenses = (input.upcomingExpenses ?? []).filter((e) => {
    if (!e || !e.dueDate) return false;
    const dueStr = e.dueDate.slice(0, 10);
    return dueStr <= bufferedCutoffDateStr;
  });

  const envImmediateExpensesMap = new Map<string, number>();
  for (const exp of upcomingExpenses) {
    const targetId = exp.envelopeId || exp.poolId;
    if (!targetId) continue;
    const cents = toCents(exp.amount);
    envImmediateExpensesMap.set(targetId, (envImmediateExpensesMap.get(targetId) ?? 0) + cents);
  }

  const step1AllocatedCentsMap = new Map<string, number>();

  const isBucketEligible = (bucket: EngineBucket) => {
    if (bucket.isPrivate && bucket.userId && input.incomeUserId && bucket.userId !== input.incomeUserId) {
      return false;
    }
    return true;
  };

  const sym = input.currencySymbol || "$";

  const allocateToBucket = (bucket: EngineBucket, amountCents: number, reasoning: string) => {
    if (amountCents <= 0) return;
    if (!isBucketEligible(bucket)) return;
    const line = linesMap.get(bucket.id)!;
    line.amountCents += amountCents;
    line.reasonings.push(reasoning);
    remainingCents -= amountCents;
  };

  // STEP 1: IMMEDIATE CASHFLOW FEASIBILITY GUARD
  // Why: Prevents immediate overdraft and bill bounce penalties. Before funding everyday
  // spending or discretionary goals, we must guarantee that any scheduled bills falling due
  // within the current paycheck cycle (plus buffer days) are 100% covered.
  const billBuckets = input.buckets.filter(isBillsBucket);
  const sortedForStep1 = [...billBuckets].sort((a, b) => {
    if (a.isEssential && !b.isEssential) return -1;
    if (!a.isEssential && b.isEssential) return 1;
    return 0;
  });

  for (const bucket of sortedForStep1) {
    const immediateDueCents = envImmediateExpensesMap.get(bucket.id) ?? 0;
    if (immediateDueCents > 0) {
      const currentCents = Math.max(0, toCents(bucket.currentBalance));
      const shortfallCents = Math.max(0, immediateDueCents - currentCents);
      const toAllocate = Math.min(remainingCents, shortfallCents);
      if (toAllocate > 0) {
        allocateToBucket(
          bucket,
          toAllocate,
          `Immediate bill coverage (${sym}${toDollars(immediateDueCents).toFixed(2)} due within cycle + ${bufferDays}d buffer): ${sym}${toDollars(toAllocate).toFixed(2)} allocated.`
        );
        step1AllocatedCentsMap.set(bucket.id, toAllocate);
      }
    }
  }

  // STEP 2: DEFICIT REPAIR
  // Why: Restores underwater envelopes to $0 balance. Negative balances occur when transactions
  // exceed previous allocations or unexpected debits occur. Repairing negative balances
  // immediately prevents snowballing ledger drift and maintains mathematical solvency.
  for (const bucket of input.buckets) {
    if (bucket.currentBalance < 0) {
      const deficitCents = Math.abs(toCents(bucket.currentBalance));
      const toAllocate = Math.min(remainingCents, deficitCents);
      if (toAllocate > 0) {
        allocateToBucket(
          bucket,
          toAllocate,
          `Deficit repair for negative balance (-${sym}${Math.abs(bucket.currentBalance).toFixed(2)}): ${sym}${toDollars(toAllocate).toFixed(2)} allocated.`
        );
      }
    }
  }

  // STEP 3: BILLS SAFETY FLOOR CUSHION
  // Why: Top-up minimum safety reserves for committed bills before funding discretionary living.
  // This provides an operational cushion against billing timing discrepancies and variable rate spikes.
  for (const bucket of sortedForStep1) {
    const floorCents = toCents(bucket.safetyBufferFloor ?? 0);
    if (floorCents > 0) {
      const currentBalanceCents = Math.max(0, toCents(bucket.currentBalance));
      const step1Alloc = step1AllocatedCentsMap.get(bucket.id) ?? 0;
      const effectiveBalCents = currentBalanceCents + step1Alloc;
      const floorDeficitCents = Math.max(0, floorCents - effectiveBalCents);
      const toAllocate = Math.min(remainingCents, floorDeficitCents);
      if (toAllocate > 0) {
        allocateToBucket(
          bucket,
          toAllocate,
          `Bills safety buffer cushion (floor ${sym}${toDollars(floorCents).toFixed(2)}): ${sym}${toDollars(toAllocate).toFixed(2)} allocated.`
        );
        step1AllocatedCentsMap.set(bucket.id, step1Alloc + toAllocate);
      }
    }
  }

  // STEP 4: BASELINE EVERYDAY LIVING ALLOWANCE
  const everydayBuckets = input.buckets.filter((b) => b.type === "EVERYDAY");
  for (const bucket of everydayBuckets) {
    const monthlyAllowanceCents = toCents(bucket.monthlyAmount ?? bucket.targetAmount ?? 0);
    const cycleAllowanceCents = Math.round(monthlyAllowanceCents * cycleFactor);
    const floorCents = toCents(bucket.safetyBufferFloor ?? 0);
    const currentBalanceCents = Math.max(0, toCents(bucket.currentBalance));
    const floorDeficitCents = Math.max(0, floorCents - currentBalanceCents);
    const reportedLeftoverDollars = input.everydayLeftoverReported?.[bucket.id] ?? 0;
    const reportedLeftoverCents = toCents(Math.max(0, reportedLeftoverDollars));

    let baseNeededCents = cycleAllowanceCents + floorDeficitCents;
    if (reportedLeftoverCents > 0) {
      baseNeededCents = Math.max(0, baseNeededCents - reportedLeftoverCents);
    }
    const neededCents = baseNeededCents;

    const toAllocate = Math.min(remainingCents, neededCents);
    if (toAllocate > 0 || neededCents > 0) {
      if (toAllocate > 0) {
        const floorMsg = floorCents > 0 ? ` (incl ${sym}${toDollars(floorCents).toFixed(2)} safety floor)` : "";
        const leftoverMsg = reportedLeftoverCents > 0 ? ` (adjusted for ${sym}${toDollars(reportedLeftoverCents).toFixed(2)} reported leftover)` : "";
        const runwayPrefix = isIrregular ? `[${daysGap}d runway] ` : "";
        allocateToBucket(
          bucket,
          toAllocate,
          `${runwayPrefix}Everyday living allowance (${sym}${toDollars(monthlyAllowanceCents).toFixed(2)}/mo across ${daysGap} days)${floorMsg}${leftoverMsg}: ${sym}${toDollars(toAllocate).toFixed(2)} allocated.`
        );
      } else {
        const line = linesMap.get(bucket.id)!;
        line.reasonings.push(`Everyday living allowance: ${sym}0 allocated.`);
      }
    }
  }

  // STEP 5: PRO-RATA FUTURE BILLS
  const fundSinkingBills = (bucketsList: EngineBucket[]) => {
    const sorted = [...bucketsList].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    for (const bucket of sorted) {
      const monthlyCents = toCents(bucket.monthlyAmount ?? bucket.targetAmount ?? 0);
      const cycleTargetCents = Math.round(monthlyCents * cycleFactor);
      const priorAlloc = step1AllocatedCentsMap.get(bucket.id) ?? 0;
      const additionalNeededCents = Math.max(0, cycleTargetCents - priorAlloc);
      const toAllocate = Math.min(remainingCents, additionalNeededCents);

      if (toAllocate > 0 || additionalNeededCents > 0) {
        if (toAllocate > 0) {
          const runwayPrefix = isIrregular ? `[${daysGap}d runway] ` : "";
          allocateToBucket(
            bucket,
            toAllocate,
            `${runwayPrefix}Pro-rata bill allocation (${sym}${toDollars(monthlyCents).toFixed(2)}/mo across ${daysGap} days): ${sym}${toDollars(toAllocate).toFixed(2)} allocated.`
          );
        } else {
          const line = linesMap.get(bucket.id)!;
          line.reasonings.push(`Pro-rata bill target (${sym}${toDollars(monthlyCents).toFixed(2)}/mo): ${sym}0 allocated (insufficient income).`);
        }
      }
    }
  };

  const essentialBills = billBuckets.filter((b) => b.isEssential);
  fundSinkingBills(essentialBills);

  const standardBills = billBuckets.filter((b) => !b.isEssential);
  fundSinkingBills(standardBills);

  // STEP 6: COMMITTED SAVINGS GOALS
  const fundGoalsList = (goalsList: EngineBucket[]) => {
    const sortedGoals = [...goalsList].sort((a, b) => {
      if (!a.targetDate) return 1;
      if (!b.targetDate) return -1;
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    });

    for (const bucket of sortedGoals) {
      const targetCents = toCents(bucket.targetAmount ?? 0);
      const currentCents = Math.max(0, toCents(bucket.currentBalance));
      const gapCents = Math.max(0, targetCents - currentCents);

      if (bucket.type === "ONGOING_GOAL" || bucket.goalMode === "ONGOING") {
        const neededCents = Math.round(targetCents * cycleFactor);
        const toAllocate = Math.min(remainingCents, neededCents);
        if (toAllocate > 0 || neededCents > 0) {
          if (toAllocate > 0) {
            allocateToBucket(
              bucket,
              toAllocate,
              `Ongoing goal contribution (${sym}${toDollars(targetCents).toFixed(2)}/mo across ${daysGap} days): ${sym}${toDollars(toAllocate).toFixed(2)} allocated.`
            );
          } else {
            const line = linesMap.get(bucket.id)!;
            line.reasonings.push(`Ongoing goal contribution (${sym}${toDollars(targetCents).toFixed(2)}/mo): ${sym}0 allocated (insufficient income).`);
          }
        }
        continue;
      }

      if (gapCents <= 0) continue;

      let neededCents = gapCents;
      let monthsRemaining = 12;

      if (bucket.targetDate) {
        const targetTime = new Date(bucket.targetDate).getTime();
        if (targetTime <= baseNextCutoffTime) {
          neededCents = gapCents;
        } else {
          const diffMs = targetTime - input.paycheckDate.getTime();
          const diffDays = Math.max(1, diffMs / (1000 * 60 * 60 * 24));
          monthsRemaining = Math.max(1, Math.ceil(diffDays / 30.4375));
          const monthlyTargetCents = Math.round(gapCents / monthsRemaining);
          neededCents = Math.min(gapCents, Math.round((monthlyTargetCents * 12) / paychecksPerYear));
        }
      } else {
        const monthlyTargetCents = Math.round(gapCents / monthsRemaining);
        neededCents = Math.min(gapCents, Math.round((monthlyTargetCents * 12) / paychecksPerYear));
      }

      const toAllocate = Math.min(remainingCents, neededCents);
      if (toAllocate > 0 || neededCents > 0) {
        if (toAllocate > 0) {
          allocateToBucket(
            bucket,
            toAllocate,
            `Target ${sym}${toDollars(targetCents).toFixed(2)} by ${bucket.targetDate ?? "12-mo horizon"}: ${sym}${toDollars(toAllocate).toFixed(2)} allocated (${monthsRemaining} mo remaining).`
          );
        } else {
          const line = linesMap.get(bucket.id)!;
          line.reasonings.push(`Goal target (${sym}${toDollars(targetCents).toFixed(2)}): ${sym}0 allocated (insufficient income).`);
        }
      }
    }
  };

  const goalBuckets = input.buckets.filter(isGoalBucket);
  const goalCommitted = goalBuckets.filter((b) => b.isCommitted);
  fundGoalsList(goalCommitted);

  // STEP 7: UNCOMMITTED GOALS & RESIDUAL SURPLUS SWEEP
  const goalUncommitted = goalBuckets.filter((b) => !b.isCommitted && !b.isSurplusTarget);
  fundGoalsList(goalUncommitted);

  const excessBucket = input.buckets.find((b) => b.isSurplusTarget) || goalBuckets[0] || everydayBuckets[0];
  if (excessBucket && remainingCents > 0) {
    const toAllocate = remainingCents;
    allocateToBucket(
      excessBucket,
      toAllocate,
      `Swept residual excess surplus of ${sym}${toDollars(toAllocate).toFixed(2)} to designated surplus envelope (${excessBucket.name}).`
    );
  }

  const lines: AllocationLine[] = Array.from(linesMap.entries()).map(([bucketId, data]) => ({
    bucketId,
    bucketName: data.bucketName,
    proposedAmount: toDollars(data.amountCents),
    reasoning: data.reasonings.length > 0 ? data.reasonings.join(" ") : "No allocation needed.",
  }));

  const isInsufficient = lines.some((l) => {
    const bucket = input.buckets.find((b) => b.id === l.bucketId);
    if (!bucket || (!bucket.isEssential && !bucket.isCommitted && !isBillsBucket(bucket))) return false;
    const monthlyTargetCents = toCents(bucket.monthlyAmount ?? bucket.targetAmount ?? 0);
    return l.proposedAmount === 0 && monthlyTargetCents > 0;
  });

  return {
    status: isInsufficient ? "INSUFFICIENT" : "OK",
    lines,
    unallocatedAmount: toDollars(remainingCents),
  };
}
