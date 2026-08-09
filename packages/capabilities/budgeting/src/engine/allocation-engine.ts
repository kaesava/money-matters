/**
 * Paycheck Cascade Waterfall Allocation Engine (V2 - Smart Due Date & Essential Hierarchy)
 * 
 * Implements deterministic 5-step waterfall logic distributing incoming paychecks:
 * 0. DEFICIT REPAIR: Restores any overdrawn/negative buckets to $0.
 * 1. ESSENTIAL REGULAR (Bills): Priority 1 bills (Rent/Mortgage, Utilities) ordered by due date.
 * 2. STANDARD REGULAR (Bills): Other bills prorated with exact annualization (12 * monthly / paychecksPerYear).
 * 3. GOAL (Committed): Priority savings targets funded before discretionary spending.
 * 4. EVERYDAY Top-Up: Top up Everyday bucket to target allowance cap.
 * 5. GOAL (Uncommitted) & Default Excess: Sweeps all remaining residual funds to Offset/Default bucket.
 */

export type BucketType = "REGULAR" | "GOAL" | "EVERYDAY";

export interface EngineBucket {
  id: string;
  name: string;
  type: BucketType;
  isEssential?: boolean;
  isCommitted?: boolean;
  monthlyAmount?: number | null;
  targetAmount?: number | null;
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
}

export interface AllocationEngineOutput {
  status: "OK" | "INSUFFICIENT";
  lines: AllocationLine[];
  unallocatedAmount: number;
}

export function runAllocationEngine(input: AllocationEngineInput): AllocationEngineOutput {
  let remaining = input.incomeAmount;
  const lines: AllocationLine[] = [];

  const paychecksPerYear = Math.max(1, Math.round(365 / input.paycheckFrequencyDays));

  // Step 0: DEFICIT REPAIR — Priority First for any negative bucket balances
  for (const bucket of input.buckets) {
    if (bucket.currentBalance < 0) {
      const deficit = Math.abs(bucket.currentBalance);
      const allocated = Math.min(remaining, deficit);
      remaining = Number((remaining - allocated).toFixed(2));

      lines.push({
        bucketId: bucket.id,
        bucketName: bucket.name,
        proposedAmount: allocated,
        reasoning: `Deficit repair for negative balance (-$${deficit.toFixed(2)}): $${allocated.toFixed(2)} allocated.`,
      });
    }
  }

  // Helper to allocate REGULAR bills
  const fundRegularBills = (bucketsList: EngineBucket[]) => {
    // Sort by due date urgency
    const sorted = [...bucketsList].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    for (const bucket of sorted) {
      const monthlyAmt = bucket.monthlyAmount ?? 0;
      const prorated = (monthlyAmt * 12) / paychecksPerYear;
      const needed = Math.max(0, Number(prorated.toFixed(2)));
      const allocated = Math.min(remaining, needed);
      remaining = Number((remaining - allocated).toFixed(2));

      const existingIndex = lines.findIndex((l) => l.bucketId === bucket.id);
      if (existingIndex >= 0) {
        lines[existingIndex]!.proposedAmount = Number((lines[existingIndex]!.proposedAmount + allocated).toFixed(2));
        lines[existingIndex]!.reasoning += ` Plus prorated bill target of $${allocated.toFixed(2)}.`;
      } else {
        lines.push({
          bucketId: bucket.id,
          bucketName: bucket.name,
          proposedAmount: allocated,
          reasoning: `Prorated bill target ($${monthlyAmt.toFixed(2)}/mo): $${allocated.toFixed(2)} allocated (due ${bucket.dueDate ?? "recurring"}).`,
        });
      }
    }
  };

  // Step 1: ESSENTIAL REGULAR (Bills)
  const essentialBills = input.buckets.filter((b) => b.type === "REGULAR" && b.isEssential);
  fundRegularBills(essentialBills);

  // Step 2: STANDARD REGULAR (Bills)
  const standardBills = input.buckets.filter((b) => b.type === "REGULAR" && !b.isEssential);
  fundRegularBills(standardBills);

  // Helper for GOAL targets
  const fundGoals = (bucketsList: EngineBucket[]) => {
    for (const bucket of bucketsList) {
      const target = bucket.targetAmount ?? 0;
      const current = Math.max(0, bucket.currentBalance);
      const gap = Math.max(0, target - current);
      
      let monthsRemaining = 12;
      if (bucket.targetDate) {
        const targetD = new Date(bucket.targetDate);
        const diffMs = targetD.getTime() - input.paycheckDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        monthsRemaining = Math.max(1, Math.ceil(diffDays / 30.4375));
      }

      const monthlyTarget = gap / monthsRemaining;
      const needed = Math.max(0, Number(((monthlyTarget * 12) / paychecksPerYear).toFixed(2)));
      const allocated = Math.min(remaining, needed);
      remaining = Number((remaining - allocated).toFixed(2));

      const existingIndex = lines.findIndex((l) => l.bucketId === bucket.id);
      if (existingIndex >= 0) {
        lines[existingIndex]!.proposedAmount = Number((lines[existingIndex]!.proposedAmount + allocated).toFixed(2));
        lines[existingIndex]!.reasoning += ` Plus goal target allocation of $${allocated.toFixed(2)}.`;
      } else {
        lines.push({
          bucketId: bucket.id,
          bucketName: bucket.name,
          proposedAmount: allocated,
          reasoning: `Target $${target.toFixed(2)} by ${bucket.targetDate ?? "unspecified"}: $${allocated.toFixed(2)} allocated.`,
        });
      }
    }
  };

  // Step 3: GOAL (Committed)
  const goalCommitted = input.buckets.filter((b) => b.type === "GOAL" && b.isCommitted);
  fundGoals(goalCommitted);

  // Step 4: EVERYDAY Top-Up Cap
  const everydayBuckets = input.buckets.filter((b) => b.type === "EVERYDAY");
  for (const bucket of everydayBuckets) {
    const targetCap = bucket.targetAmount ?? bucket.monthlyAmount ?? 0;
    const currentPositiveBal = Math.max(0, bucket.currentBalance);
    const topUpNeeded = Math.max(0, targetCap - currentPositiveBal);
    const allocated = Math.min(remaining, topUpNeeded);
    remaining = Number((remaining - allocated).toFixed(2));

    const existingIndex = lines.findIndex((l) => l.bucketId === bucket.id);
    if (existingIndex >= 0) {
      lines[existingIndex]!.proposedAmount = Number((lines[existingIndex]!.proposedAmount + allocated).toFixed(2));
      lines[existingIndex]!.reasoning += ` Plus Everyday top-up of $${allocated.toFixed(2)}.`;
    } else {
      lines.push({
        bucketId: bucket.id,
        bucketName: bucket.name,
        proposedAmount: allocated,
        reasoning: `Everyday top-up allocation of $${allocated.toFixed(2)} (target cap $${targetCap.toFixed(2)}).`,
      });
    }
  }

  // Step 5: GOAL (Uncommitted) & Residual Sweep to Default Excess Bucket
  const goalUncommitted = input.buckets.filter((b) => b.type === "GOAL" && !b.isCommitted);
  fundGoals(goalUncommitted);

  const excessBucket = everydayBuckets[0] || input.buckets.find((b) => b.type === "GOAL");
  if (excessBucket && remaining > 0) {
    const allocated = remaining;
    remaining = 0;
    
    const existingIndex = lines.findIndex((l) => l.bucketId === excessBucket.id);
    if (existingIndex >= 0) {
      lines[existingIndex]!.proposedAmount = Number((lines[existingIndex]!.proposedAmount + allocated).toFixed(2));
      lines[existingIndex]!.reasoning += ` Swept residual excess surplus of $${allocated.toFixed(2)}.`;
    } else {
      lines.push({
        bucketId: excessBucket.id,
        bucketName: excessBucket.name,
        proposedAmount: allocated,
        reasoning: `Swept residual excess surplus of $${allocated.toFixed(2)} to default bucket.`,
      });
    }
  }

  const isInsufficient = input.incomeAmount > 0 && lines.some((l) => {
    const bucket = input.buckets.find((b) => b.id === l.bucketId);
    if (!bucket || (!bucket.isEssential && !bucket.isCommitted && bucket.type !== "REGULAR")) return false;
    return l.proposedAmount === 0;
  });

  return {
    status: isInsufficient ? "INSUFFICIENT" : "OK",
    lines,
    unallocatedAmount: remaining,
  };
}
