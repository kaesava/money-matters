/**
 * Paycheck Cascade Waterfall Allocation Engine
 * 
 * Implements deterministic 4-step waterfall logic distributing incoming paychecks across:
 * 1. REGULAR (Bills): Prorated monthly bill targets based on pay frequency.
 * 2. GOAL (Committed): Priority savings targets funded before discretionary spending.
 * 3. GOAL (Uncommitted): Secondary goal targets funded if excess funds remain.
 * 4. EVERYDAY / Default Excess: Sweeps all remaining residual funds into cash balance.
 */

/** Category bucket classification within the 3-bucket model. */
export type BucketType = "REGULAR" | "GOAL" | "EVERYDAY";

/**
 * Data structure representing a category bucket input to the allocation waterfall.
 */
export interface EngineBucket {
  /** Unique UUID identifier for the category bucket. */
  id: string;
  /** Category display name. */
  name: string;
  /** Bucket architecture classification (REGULAR, GOAL, EVERYDAY). */
  type: BucketType;
  /** Flag indicating high-priority committed savings goal. */
  isCommitted: boolean;
  /** Default excess sweep target flag. */
  isDefaultExcess: boolean;
  /** Target monthly obligation amount for REGULAR bill buckets. */
  monthlyAmount: number | null;
  /** Total target amount for GOAL savings buckets. */
  targetAmount: number | null;
  /** ISO date string for goal completion deadline. */
  targetDate: string | null;
  /** Current ledger balance of the category bucket. */
  currentBalance: number;
}

/**
 * Proposed allocation line item outcome for a single category bucket.
 */
export interface AllocationLine {
  bucketId: string;
  bucketName: string;
  proposedAmount: number;
  reasoning: string;
}

/**
 * Input context passed to the allocation waterfall calculation.
 */
export interface AllocationEngineInput {
  incomeAmount: number;
  buckets: EngineBucket[];
  paycheckDate: Date;
  paycheckFrequencyDays: number; // 7 = weekly, 14 = fortnightly, 30 = monthly
}

/**
 * Result structure produced by the allocation waterfall engine.
 */
export interface AllocationEngineOutput {
  status: "OK" | "INSUFFICIENT";
  lines: AllocationLine[];
  unallocatedAmount: number;
}

/**
 * Pure allocation waterfall calculation engine.
 * 
 * Steps:
 * 1. REGULAR (Bills): Monthly amount prorated by pay frequency: monthlyAmount * (frequencyDays / 30.4375)
 * 2. GOAL (Committed): monthlyContribution = (targetAmount - balance) / monthsRemaining
 * 3. GOAL (Uncommitted): same monthlyContribution formula, funded if funds remain
 * 4. EVERYDAY / Default Excess: receives the remaining residual income
 *
 * @param input - Paycheck amount, bucket list, paycheck date, and frequency
 * @returns Proposed line allocations, execution status, and residual amount
 */
export function runAllocationEngine(input: AllocationEngineInput): AllocationEngineOutput {
  let remaining = input.incomeAmount;
  const lines: AllocationLine[] = [];

  // Group buckets
  const regularBuckets = input.buckets.filter((b) => b.type === "REGULAR");
  const goalCommitted = input.buckets.filter((b) => b.type === "GOAL" && b.isCommitted);
  const goalUncommitted = input.buckets.filter((b) => b.type === "GOAL" && !b.isCommitted);
  const excessBucket = input.buckets.find((b) => b.isDefaultExcess) || input.buckets.find((b) => b.type === "EVERYDAY");

  // Step 1: REGULAR (Bills)
  for (const bucket of regularBuckets) {
    const monthlyAmt = bucket.monthlyAmount ?? 0;
    const prorated = monthlyAmt * (input.paycheckFrequencyDays / 30.4375);
    const needed = Math.max(0, Number(prorated.toFixed(2)));
    const allocated = Math.min(remaining, needed);
    remaining = Number((remaining - allocated).toFixed(2));

    lines.push({
      bucketId: bucket.id,
      bucketName: bucket.name,
      proposedAmount: allocated,
      reasoning: `Prorated monthly bill target of $${monthlyAmt.toFixed(2)}: $${allocated.toFixed(2)} allocated.`,
    });
  }

  // Helper for GOAL monthly target calculation
  const fundGoals = (bucketsList: EngineBucket[]) => {
    for (const bucket of bucketsList) {
      const target = bucket.targetAmount ?? 0;
      const current = bucket.currentBalance;
      const gap = Math.max(0, target - current);
      
      let monthsRemaining = 12;
      if (bucket.targetDate) {
        const targetD = new Date(bucket.targetDate);
        const diffMs = targetD.getTime() - input.paycheckDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        monthsRemaining = Math.max(1, Math.ceil(diffDays / 30.4375));
      }

      const monthlyTarget = gap / monthsRemaining;
      const needed = Math.max(0, Number((monthlyTarget * (input.paycheckFrequencyDays / 30.4375)).toFixed(2)));
      const allocated = Math.min(remaining, needed);
      remaining = Number((remaining - allocated).toFixed(2));

      lines.push({
        bucketId: bucket.id,
        bucketName: bucket.name,
        proposedAmount: allocated,
        reasoning: `Target $${target.toFixed(2)} by ${bucket.targetDate ?? "unspecified"}: $${allocated.toFixed(2)} allocated.`,
      });
    }
  };

  // Step 2: GOAL (Committed)
  fundGoals(goalCommitted);

  // Step 3: GOAL (Uncommitted)
  fundGoals(goalUncommitted);

  // Step 4: EVERYDAY / Default Excess Sweep
  if (excessBucket) {
    const allocated = Math.max(0, remaining);
    remaining = 0;
    
    // Add or update existing line for excess
    const existingIndex = lines.findIndex((l) => l.bucketId === excessBucket.id);
    if (existingIndex >= 0) {
      lines[existingIndex]!.proposedAmount = Number((lines[existingIndex]!.proposedAmount + allocated).toFixed(2));
      lines[existingIndex]!.reasoning += ` Swept residual excess of $${allocated.toFixed(2)}.`;
    } else {
      lines.push({
        bucketId: excessBucket.id,
        bucketName: excessBucket.name,
        proposedAmount: allocated,
        reasoning: `Swept residual excess of $${allocated.toFixed(2)} to default bucket.`,
      });
    }
  }

  // If we couldn't allocate needed targets, status is INSUFFICIENT
  const isInsufficient = input.incomeAmount > 0 && lines.some((l) => l.proposedAmount === 0 && l.bucketId !== excessBucket?.id);

  return {
    status: isInsufficient ? "INSUFFICIENT" : "OK",
    lines,
    unallocatedAmount: remaining,
  };
}

