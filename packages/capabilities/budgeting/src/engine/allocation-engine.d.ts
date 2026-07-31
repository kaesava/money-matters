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
    paycheckFrequencyDays: number;
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
 * 0. DEFICIT REPAIR: Priority 1 - Any bucket with currentBalance < 0 is restored to $0.
 * 1. REGULAR (Bills): Monthly amount prorated by pay frequency: monthlyAmount * (frequencyDays / 30.4375)
 * 2. GOAL (Committed): monthlyContribution = (targetAmount - balance) / monthsRemaining
 * 3. EVERYDAY Top-Up: Top up Everyday bucket to target allowance cap: max(0, targetAmount - balance)
 * 4. GOAL (Uncommitted) & Default Excess: Sweeps all remaining residual income into default excess bucket (e.g. Offset/Emergency) or uncommitted goals.
 *
 * @param input - Paycheck amount, bucket list, paycheck date, and frequency
 * @returns Proposed line allocations, execution status, and residual amount
 */
export declare function runAllocationEngine(input: AllocationEngineInput): AllocationEngineOutput;
//# sourceMappingURL=allocation-engine.d.ts.map