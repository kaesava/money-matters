import { EnvelopeType } from "@money-matters/types";
import { isBillsBucket, isGoalBucket, isEverydayBucket } from "./envelope-engine-mapper.js";
import { toCents, toDollars, calculateCycleFactor } from "./allocation-engine-utils.js";
import {
  StepContext,
  runStep1ImmediateBills,
  runStep2DeficitRepair,
  runStep3BillsSafetyFloor,
  runStep4EverydayAllowance,
  runStep5ProRataBills,
  runStep6Goals,
  runStep7SurplusSweep,
} from "./allocation-engine-steps.js";

export { isBillsBucket, isGoalBucket, isEverydayBucket };

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
  enteredAmount?: number | null;
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
  currencySymbol?: string;
  timezone?: string;
}

export interface AllocationEngineOutput {
  status: "OK" | "INSUFFICIENT";
  lines: AllocationLine[];
  unallocatedAmount: number;
}

export function runAllocationEngine(input: AllocationEngineInput): AllocationEngineOutput {
  const isIrregular = input.incomeType === "IRREGULAR";
  const regularCycleDays = isIrregular ? (input.runwayDays ?? 30) : input.paycheckFrequencyDays;
  const cycleFactor = calculateCycleFactor(regularCycleDays, isIrregular);
  const bufferDays = input.dueBufferDays ?? 3;

  const baseNextCutoffTime = input.nextPaycheckDate
    ? input.nextPaycheckDate.getTime()
    : input.paycheckDate.getTime() + (input.daysUntilNextIncome ?? regularCycleDays) * 24 * 60 * 60 * 1000;

  const bufferedCutoffTime = baseNextCutoffTime + bufferDays * 24 * 60 * 60 * 1000;
  const targetTz = input.timezone || "UTC";
  const bufferedCutoffDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: targetTz }).format(new Date(bufferedCutoffTime));

  const allExpenses = input.upcomingExpenses ?? [];
  const immediateExpenses = allExpenses.filter((e) => e && e.dueDate && e.dueDate.slice(0, 10) <= bufferedCutoffDateStr);
  const futureExpenses = allExpenses.filter((e) => e && e.dueDate && e.dueDate.slice(0, 10) > bufferedCutoffDateStr);

  const envImmediateExpensesMap = new Map<string, number>();
  for (const exp of immediateExpenses) {
    const targetId = exp.envelopeId || exp.poolId;
    if (!targetId) continue;
    envImmediateExpensesMap.set(targetId, (envImmediateExpensesMap.get(targetId) ?? 0) + toCents(exp.amount));
  }

  const linesMap = new Map<string, { bucketName: string; amountCents: number; reasonings: string[] }>();
  const runningBalances = new Map<string, number>();
  for (const b of input.buckets) {
    linesMap.set(b.id, { bucketName: b.name, amountCents: 0, reasonings: [] });
    runningBalances.set(b.id, toCents(b.currentBalance));
  }

  const isBucketEligible = (b: EngineBucket) => {
    if (b.isPrivate && b.userId && input.incomeUserId && b.userId !== input.incomeUserId) {
      return false;
    }
    return true;
  };

  const ctx: StepContext = {
    remainingCents: toCents(Math.max(0, input.incomeAmount || 0)),
    linesMap,
    runningBalances,
    priorBillAllocated: new Map(),
    currencySymbol: input.currencySymbol || "$",
    cycleFactor,
    regularCycleDays,
    bufferDays,
    bufferedCutoffDateStr,
    isIrregular,
    isBucketEligible,
  };

  const billBuckets = input.buckets.filter(isBillsBucket);
  const everydayBuckets = input.buckets.filter(isEverydayBucket);
  const goalBuckets = input.buckets.filter(isGoalBucket);

  runStep1ImmediateBills(ctx, billBuckets, envImmediateExpensesMap);
  runStep2DeficitRepair(ctx, input.buckets);
  runStep3BillsSafetyFloor(ctx, billBuckets);
  runStep4EverydayAllowance(ctx, everydayBuckets);

  const essentialBills = billBuckets.filter((b) => b.isEssential);
  const standardBills = billBuckets.filter((b) => !b.isEssential);
  runStep5ProRataBills(ctx, essentialBills, futureExpenses, input.paycheckDate);
  runStep5ProRataBills(ctx, standardBills, futureExpenses, input.paycheckDate);

  const committedGoals = goalBuckets.filter((b) => b.isCommitted);
  const uncommittedGoals = goalBuckets.filter((b) => !b.isCommitted && !b.isSurplusTarget);
  runStep6Goals(ctx, committedGoals, input.paycheckDate, baseNextCutoffTime);
  runStep6Goals(ctx, uncommittedGoals, input.paycheckDate, baseNextCutoffTime);

  runStep7SurplusSweep(ctx, input.buckets);

  const lines: AllocationLine[] = Array.from(linesMap.entries()).map(([bucketId, data]) => ({
    bucketId,
    bucketName: data.bucketName,
    proposedAmount: toDollars(data.amountCents),
    reasoning: data.reasonings.length > 0 ? data.reasonings.join(" ") : "No allocation needed.",
  }));

  const isInsufficient = lines.some((l) => {
    const bucket = input.buckets.find((b) => b.id === l.bucketId);
    if (!bucket || (!bucket.isEssential && !bucket.isCommitted && !isBillsBucket(bucket))) return false;
    const monthlyTarget = toCents(bucket.monthlyAmount ?? bucket.targetAmount ?? 0);
    return l.proposedAmount === 0 && monthlyTarget > 0;
  });

  return {
    status: isInsufficient ? "INSUFFICIENT" : "OK",
    lines,
    unallocatedAmount: toDollars(ctx.remainingCents),
  };
}
