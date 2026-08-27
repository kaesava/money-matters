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

export interface EngineBucket {
  id: string;
  name: string;
  type: BucketType;
  userId?: string;
  isPrivate?: boolean;
  isEssential?: boolean;
  isCommitted?: boolean;
  isSurplusTarget?: boolean;
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
  buckets: EngineBucket[];
  paycheckDate: Date;
  paycheckFrequencyDays: number; // 7 = weekly, 14 = fortnightly, 30 = monthly
  daysUntilNextIncome?: number; // Optional Time-Based Accumulation gap in days until next income event
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

  const daysGap = input.daysUntilNextIncome ?? input.paycheckFrequencyDays;
  const paychecksPerYear = Math.max(1, Math.round(365 / input.paycheckFrequencyDays));

  // Step 0: DEFICIT REPAIR — Priority First for any negative bucket balances
  for (const bucket of input.buckets) {
    if (bucket.currentBalance < 0) {
      const deficitCents = Math.abs(toCents(bucket.currentBalance));
      const allocatedCents = Math.min(remainingCents, deficitCents);
      remainingCents -= allocatedCents;

      if (allocatedCents > 0) {
        linesMap.set(bucket.id, {
          bucketName: bucket.name,
          amountCents: allocatedCents,
          reasonings: [`Deficit repair for negative balance (-$${Math.abs(bucket.currentBalance).toFixed(2)}): $${toDollars(allocatedCents).toFixed(2)} allocated.`],
        });
      }
    }
  }

  // Helper to allocate REGULAR bills (Time-Based Accumulation)
  const fundRegularBills = (bucketsList: EngineBucket[]) => {
    const sorted = [...bucketsList].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    for (const bucket of sorted) {
      const monthlyCents = toCents(bucket.monthlyAmount ?? 0);
      
      // Time-based accumulation using 364 payroll days per year (52 weeks * 7 days)
      const targetNeededCents = Math.round((monthlyCents * 12 * daysGap) / 364);
      
      const allocatedCents = Math.min(remainingCents, targetNeededCents);
      remainingCents -= allocatedCents;

      if (allocatedCents > 0 || targetNeededCents > 0) {
        const existing = linesMap.get(bucket.id);
        const reasoningMsg = `Time-based bill target ($${toDollars(monthlyCents).toFixed(2)}/mo across ${daysGap} days): $${toDollars(allocatedCents).toFixed(2)} allocated.`;
        
        if (existing) {
          existing.amountCents += allocatedCents;
          existing.reasonings.push(reasoningMsg);
        } else {
          linesMap.set(bucket.id, {
            bucketName: bucket.name,
            amountCents: allocatedCents,
            reasonings: [reasoningMsg],
          });
        }
      }
    }
  };

  // Step 1: ESSENTIAL REGULAR (Bills)
  const essentialBills = input.buckets.filter((b) => b.type === "REGULAR" && b.isEssential);
  fundRegularBills(essentialBills);

  // Step 2: STANDARD REGULAR (Bills)
  const standardBills = input.buckets.filter((b) => b.type === "REGULAR" && !b.isEssential);
  fundRegularBills(standardBills);

  // Helper for GOAL targets (Target-Date & Gap Prioritized)
  const fundGoals = (bucketsList: EngineBucket[]) => {
    const sortedGoals = [...bucketsList].sort((a, b) => {
      if (!a.targetDate) return 1;
      if (!b.targetDate) return -1;
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    });

    for (const bucket of sortedGoals) {
      const targetCents = toCents(bucket.targetAmount ?? 0);
      const currentCents = Math.max(0, toCents(bucket.currentBalance));
      const gapCents = Math.max(0, targetCents - currentCents);
      if (gapCents <= 0) continue; // Goal is already 100% funded

      let monthsRemaining = 12;
      if (bucket.targetDate) {
        const targetD = new Date(bucket.targetDate);
        const diffMs = targetD.getTime() - input.paycheckDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        monthsRemaining = Math.max(1, Math.ceil(diffDays / 30.4375));
      }

      // Calculate required monthly contribution to hit targetAmount by targetDate
      const monthlyTargetCents = Math.round(gapCents / monthsRemaining);
      const neededCents = Math.min(gapCents, Math.round((monthlyTargetCents * 12) / paychecksPerYear));
      const allocatedCents = Math.min(remainingCents, neededCents);
      remainingCents -= allocatedCents;

      if (allocatedCents > 0 || neededCents > 0) {
        const existing = linesMap.get(bucket.id);
        const reasoningMsg = `Target $${toDollars(targetCents).toFixed(2)} by ${bucket.targetDate ?? "12-mo horizon"}: $${toDollars(allocatedCents).toFixed(2)} allocated (${monthsRemaining} mo remaining).`;

        if (existing) {
          existing.amountCents += allocatedCents;
          existing.reasonings.push(reasoningMsg);
        } else {
          linesMap.set(bucket.id, {
            bucketName: bucket.name,
            amountCents: allocatedCents,
            reasonings: [reasoningMsg],
          });
        }
      }
    }
  };

  // Step 3: GOAL (Committed)
  const goalCommitted = input.buckets.filter((b) => b.type === "GOAL" && b.isCommitted);
  fundGoals(goalCommitted);

  // Step 4: EVERYDAY Time-Based Allocation
  const everydayBuckets = input.buckets.filter((b) => b.type === "EVERYDAY");
  for (const bucket of everydayBuckets) {
    const monthlyAllowanceCents = toCents(bucket.everydayAllowanceAmount ?? bucket.monthlyAmount ?? bucket.targetAmount ?? 0);
    const targetNeededCents = Math.round((monthlyAllowanceCents * 12 * daysGap) / 364);

    const allocatedCents = Math.min(remainingCents, targetNeededCents);
    remainingCents -= allocatedCents;

    if (allocatedCents > 0 || targetNeededCents > 0) {
      const existing = linesMap.get(bucket.id);
      const reasoningMsg = `Everyday time-based allowance ($${toDollars(monthlyAllowanceCents).toFixed(2)}/mo across ${daysGap} days): $${toDollars(allocatedCents).toFixed(2)} allocated.`;
      
      if (existing) {
        existing.amountCents += allocatedCents;
        existing.reasonings.push(reasoningMsg);
      } else {
        linesMap.set(bucket.id, {
          bucketName: bucket.name,
          amountCents: allocatedCents,
          reasonings: [reasoningMsg],
        });
      }
    }
  }

  // Step 5: GOAL (Uncommitted) & Residual Sweep to Designated Surplus Target Bucket
  const goalUncommitted = input.buckets.filter((b) => b.type === "GOAL" && !b.isCommitted && !b.isSurplusTarget);
  fundGoals(goalUncommitted);

  const excessBucket = input.buckets.find((b) => b.isSurplusTarget) || input.buckets.find((b) => b.type === "GOAL") || everydayBuckets[0];
  if (excessBucket && remainingCents > 0) {
    const allocatedCents = remainingCents;
    remainingCents = 0;
    
    const existing = linesMap.get(excessBucket.id);
    const reasoningMsg = `Swept residual excess surplus of $${toDollars(allocatedCents).toFixed(2)} to designated surplus bucket (${excessBucket.name}).`;
    
    if (existing) {
      existing.amountCents += allocatedCents;
      existing.reasonings.push(reasoningMsg);
    } else {
      linesMap.set(excessBucket.id, {
        bucketName: excessBucket.name,
        amountCents: allocatedCents,
        reasonings: [reasoningMsg],
      });
    }
  }

  const lines: AllocationLine[] = Array.from(linesMap.entries()).map(([bucketId, data]) => ({
    bucketId,
    bucketName: data.bucketName,
    proposedAmount: toDollars(data.amountCents),
    reasoning: data.reasonings.join(" "),
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

