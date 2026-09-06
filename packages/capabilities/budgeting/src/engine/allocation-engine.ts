/**
 * Paycheck Cascade Waterfall Allocation Engine (V3 - Integer Cent Math & Balance-Aware Capping)
 * 
 * Implements deterministic 5-step waterfall logic distributing incoming paychecks:
 * 0. DEFICIT REPAIR: Restores any overdrawn/negative buckets to $0.
 * 1. ESSENTIAL REGULAR (Bills): Priority 1 bills (Rent/Mortgage, Utilities) ordered by due date, capped by current balance deficit.
 * 2. STANDARD REGULAR (Bills): Other bills prorated and capped by current balance deficit.
 * 3. GOAL (Committed): Priority savings targets funded before discretionary spending.
 * 4. EVERYDAY Top-Up: Top up Everyday bucket to target allowance cap.
 * 5. GOAL (Uncommitted) & Residual Sweep: Sweeps 100% of remaining funds to designated isSurplusTarget category.
 */

export type BucketType = "REGULAR" | "GOAL" | "EVERYDAY";

export interface UpcomingExpenseItem {
  id?: string;
  poolId?: string | null;
  categoryId?: string | null;
  name?: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  isEssential?: boolean;
}

export interface EngineBucket {
  id: string;
  name: string;
  type: BucketType;
  userId?: string;
  isPrivate?: boolean;
  isEssential?: boolean;
  isCommitted?: boolean;
  isSurplusTarget?: boolean;
  rolloverRule?: "ROLLOVER" | "SWEEP" | "RESET" | null;
  monthlyAmount?: number | null;
  targetAmount?: number | null;
  everydayAllowanceAmount?: number | null;
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
  incomeUserId?: string; // Tenant User ID who earned this income event (for private pool stealth isolation)
  buckets: EngineBucket[];
  paycheckDate: Date;
  paycheckFrequencyDays: number; // 7 = weekly, 14 = fortnightly, 30 = monthly
  daysUntilNextIncome?: number; // Optional Time-Based Accumulation gap in days until next income event
  nextPaycheckDate?: Date;
  upcomingExpenses?: UpcomingExpenseItem[];
  sweepEverydayLeftover?: boolean;
}

export interface AllocationEngineOutput {
  status: "OK" | "INSUFFICIENT";
  lines: AllocationLine[];
  unallocatedAmount: number;
}

/** Helper to convert decimal dollars to integer cents */
function toCents(amount: number): number {
  return Math.round((amount || 0) * 100);
}

/** Helper to convert integer cents back to decimal dollars */
function toDollars(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export function runAllocationEngine(input: AllocationEngineInput): AllocationEngineOutput {
  let remainingCents = toCents(Math.max(0, input.incomeAmount || 0));
  const linesMap = new Map<string, { bucketName: string; amountCents: number; reasonings: string[] }>();

  // Pre-seed all buckets into linesMap so every bucket is present in the output
  for (const b of input.buckets) {
    linesMap.set(b.id, {
      bucketName: b.name,
      amountCents: 0,
      reasonings: [],
    });
  }

  const daysGap = input.daysUntilNextIncome ?? input.paycheckFrequencyDays;
  const paychecksPerYear = Math.max(1, Math.round(365 / input.paycheckFrequencyDays));

  // Determine cycle factor accurately:
  // Fortnightly (14d) -> 12 / 26
  // Weekly (7d) -> 12 / 52
  // Monthly (28-31d) -> 1.0 (Exact calendar month proration)
  // Fallback -> (12 * daysGap) / 365
  let cycleFactor = (12 * daysGap) / 365;
  if (input.paycheckFrequencyDays === 14 || daysGap === 14) {
    cycleFactor = 12 / 26;
  } else if (input.paycheckFrequencyDays === 7 || daysGap === 7) {
    cycleFactor = 12 / 52;
  } else if (input.paycheckFrequencyDays >= 28 && input.paycheckFrequencyDays <= 31) {
    cycleFactor = 1.0;
  }

  // Next paycheck date cutoff for immediate cashflow feasibility
  const nextCutoffTime = input.nextPaycheckDate
    ? input.nextPaycheckDate.getTime()
    : input.paycheckDate.getTime() + daysGap * 24 * 60 * 60 * 1000;
  
  const nextCutoffDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date(nextCutoffTime));

  // Filter expenses due on or before next payday cutoff
  const upcomingExpenses = (input.upcomingExpenses ?? []).filter((e) => {
    if (!e || !e.dueDate) return false;
    const dueStr = e.dueDate.slice(0, 10);
    return dueStr <= nextCutoffDateStr;
  });

  const poolImmediateExpensesMap = new Map<string, number>();
  for (const exp of upcomingExpenses) {
    const targetPoolId = exp.poolId;
    if (!targetPoolId) continue;
    const cents = toCents(exp.amount);
    poolImmediateExpensesMap.set(targetPoolId, (poolImmediateExpensesMap.get(targetPoolId) ?? 0) + cents);
  }

  const step1AllocatedCentsMap = new Map<string, number>();

  const isBucketEligible = (bucket: EngineBucket) => {
    // Stealth privacy isolation: A partner's private pool can only receive allocations from their own income
    if (bucket.isPrivate && bucket.userId && input.incomeUserId && bucket.userId !== input.incomeUserId) {
      return false;
    }
    return true;
  };

  const allocateToBucket = (bucket: EngineBucket, amountCents: number, reasoning: string) => {
    if (amountCents <= 0) return;
    if (!isBucketEligible(bucket)) return;
    const line = linesMap.get(bucket.id)!;
    line.amountCents += amountCents;
    line.reasonings.push(reasoning);
    remainingCents -= amountCents;
  };

  // STEP 1: IMMEDIATE CASHFLOW FEASIBILITY GUARD (Due-Date Aware)
  // Guarantees bills due before the NEXT payday are 100% funded!
  // Priority: Essential regular pools first, then Standard regular pools.
  const regularBuckets = input.buckets.filter((b) => b.type === "REGULAR");
  const sortedForStep1 = [...regularBuckets].sort((a, b) => {
    if (a.isEssential && !b.isEssential) return -1;
    if (!a.isEssential && b.isEssential) return 1;
    return 0;
  });

  for (const bucket of sortedForStep1) {
    const immediateDueCents = poolImmediateExpensesMap.get(bucket.id) ?? 0;
    if (immediateDueCents > 0) {
      const currentCents = Math.max(0, toCents(bucket.currentBalance));
      const shortfallCents = Math.max(0, immediateDueCents - currentCents);
      const toAllocate = Math.min(remainingCents, shortfallCents);
      if (toAllocate > 0) {
        allocateToBucket(
          bucket,
          toAllocate,
          `Immediate bill coverage ($${toDollars(immediateDueCents).toFixed(2)} due before next pay): $${toDollars(toAllocate).toFixed(2)} allocated.`
        );
        step1AllocatedCentsMap.set(bucket.id, toAllocate);
      }
    }
  }

  // STEP 2: DEFICIT REPAIR — Restores any overdrawn/negative bucket balances to $0
  // Repaired BEFORE future sinking bills to prevent carrying overdraft holes while accruing distant funds.
  for (const bucket of input.buckets) {
    if (bucket.currentBalance < 0) {
      const deficitCents = Math.abs(toCents(bucket.currentBalance));
      const toAllocate = Math.min(remainingCents, deficitCents);
      if (toAllocate > 0) {
        allocateToBucket(
          bucket,
          toAllocate,
          `Deficit repair for negative balance (-$${Math.abs(bucket.currentBalance).toFixed(2)}): $${toDollars(toAllocate).toFixed(2)} allocated.`
        );
      }
    }
  }

  // STEP 3: RESERVE SINKING FUNDS (Pro-Rata Future Bills)
  // For bills due beyond next payday, smoothly accrue cycle target.
  const fundSinkingBills = (bucketsList: EngineBucket[]) => {
    const sorted = [...bucketsList].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    for (const bucket of sorted) {
      const monthlyCents = toCents(bucket.monthlyAmount ?? bucket.targetAmount ?? 0);
      const cycleTargetCents = Math.round(monthlyCents * cycleFactor);
      const step1Alloc = step1AllocatedCentsMap.get(bucket.id) ?? 0;
      const additionalNeededCents = Math.max(0, cycleTargetCents - step1Alloc);
      const toAllocate = Math.min(remainingCents, additionalNeededCents);
      
      if (toAllocate > 0 || additionalNeededCents > 0) {
        if (toAllocate > 0) {
          allocateToBucket(
            bucket,
            toAllocate,
            `Pro-rata reserve sinking fund ($${toDollars(monthlyCents).toFixed(2)}/mo across ${daysGap} days): $${toDollars(toAllocate).toFixed(2)} allocated.`
          );
        } else {
          const line = linesMap.get(bucket.id)!;
          line.reasonings.push(`Pro-rata bill target ($${toDollars(monthlyCents).toFixed(2)}/mo): $0 allocated (insufficient income).`);
        }
      }
    }
  };

  const essentialBills = regularBuckets.filter((b) => b.isEssential);
  fundSinkingBills(essentialBills);

  const standardBills = regularBuckets.filter((b) => !b.isEssential);
  fundSinkingBills(standardBills);

  // STEP 4: COMMITTED SAVINGS GOALS (Target-Date & Imminent Gap Prioritized)
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
      if (gapCents <= 0) continue; // Goal is already 100% funded

      let neededCents = gapCents;
      let monthsRemaining = 12;

      if (bucket.targetDate) {
        const targetTime = new Date(bucket.targetDate).getTime();
        // If target date is on or before next payday cutoff, fund 100% of remaining gap!
        if (targetTime <= nextCutoffTime) {
          neededCents = gapCents;
        } else {
          const diffMs = targetTime - input.paycheckDate.getTime();
          const diffDays = Math.max(1, diffMs / (1000 * 60 * 60 * 24));
          monthsRemaining = Math.max(1, Math.ceil(diffDays / 30.4375));
          const monthlyTargetCents = Math.round(gapCents / monthsRemaining);
          neededCents = Math.min(gapCents, Math.round((monthlyTargetCents * 12) / paychecksPerYear));
        }
      } else {
        // Fallback for dateless goals: 12-month horizon
        const monthlyTargetCents = Math.round(gapCents / monthsRemaining);
        neededCents = Math.min(gapCents, Math.round((monthlyTargetCents * 12) / paychecksPerYear));
      }

      const toAllocate = Math.min(remainingCents, neededCents);
      if (toAllocate > 0 || neededCents > 0) {
        if (toAllocate > 0) {
          allocateToBucket(
            bucket,
            toAllocate,
            `Target $${toDollars(targetCents).toFixed(2)} by ${bucket.targetDate ?? "12-mo horizon"}: $${toDollars(toAllocate).toFixed(2)} allocated (${monthsRemaining} mo remaining).`
          );
        } else {
          const line = linesMap.get(bucket.id)!;
          line.reasonings.push(`Goal target ($${toDollars(targetCents).toFixed(2)}): $0 allocated (insufficient income).`);
        }
      }
    }
  };

  const goalCommitted = input.buckets.filter((b) => b.type === "GOAL" && b.isCommitted);
  fundGoalsList(goalCommitted);

  // STEP 5: EVERYDAY TIME-BASED ALLOWANCE (Cap-Aware / Rollover)
  const everydayBuckets = input.buckets.filter((b) => b.type === "EVERYDAY");
  for (const bucket of everydayBuckets) {
    const monthlyAllowanceCents = toCents(bucket.everydayAllowanceAmount ?? bucket.monthlyAmount ?? bucket.targetAmount ?? 0);
    const cycleAllowanceCents = Math.round(monthlyAllowanceCents * cycleFactor);
    const currentPositiveCents = Math.max(0, toCents(bucket.currentBalance));

    let neededCents = cycleAllowanceCents;
    if (bucket.rolloverRule === "RESET") {
      // Top-up to cap: only allocate what is needed to bring balance to cycle allowance
      neededCents = Math.max(0, cycleAllowanceCents - currentPositiveCents);
    } else {
      // Default: allocate full cycle allowance (sweep or rollover)
      neededCents = cycleAllowanceCents;
    }

    const toAllocate = Math.min(remainingCents, neededCents);
    if (toAllocate > 0 || neededCents > 0) {
      if (toAllocate > 0) {
        allocateToBucket(
          bucket,
          toAllocate,
          `Everyday time-based allowance ($${toDollars(monthlyAllowanceCents).toFixed(2)}/mo across ${daysGap} days): $${toDollars(toAllocate).toFixed(2)} allocated.`
        );
      } else {
        const line = linesMap.get(bucket.id)!;
        line.reasonings.push(`Everyday allowance: $0 allocated.`);
      }
    }
  }

  // STEP 6: UNCOMMITTED GOALS & RESIDUAL SURPLUS SWEEP
  const goalUncommitted = input.buckets.filter((b) => b.type === "GOAL" && !b.isCommitted && !b.isSurplusTarget);
  fundGoalsList(goalUncommitted);

  // Sweep 100% of residual remaining cents to designated surplus bucket
  const excessBucket = input.buckets.find((b) => b.isSurplusTarget) || input.buckets.find((b) => b.type === "GOAL") || everydayBuckets[0];
  if (excessBucket && remainingCents > 0) {
    const toAllocate = remainingCents;
    allocateToBucket(
      excessBucket,
      toAllocate,
      `Swept residual excess surplus of $${toDollars(toAllocate).toFixed(2)} to designated surplus bucket (${excessBucket.name}).`
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
    if (!bucket || (!bucket.isEssential && !bucket.isCommitted && bucket.type !== "REGULAR")) return false;
    const monthlyTargetCents = toCents(bucket.monthlyAmount ?? bucket.targetAmount ?? 0);
    return l.proposedAmount === 0 && monthlyTargetCents > 0;
  });

  return {
    status: isInsufficient ? "INSUFFICIENT" : "OK",
    lines,
    unallocatedAmount: toDollars(remainingCents),
  };
}

