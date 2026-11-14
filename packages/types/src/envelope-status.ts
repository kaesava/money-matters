import type { EnvelopeType, FundingMode } from "./envelope.types.js";

export type EnvelopeBalanceStatus = "INACTIVE" | "COVERED" | "PARTIAL" | "SHORTFALL" | "ON_TRACK";

export interface EnvelopeStatusInput {
  id: string;
  name: string;
  envelopeType: string;
  fundingMode?: string | null;
  currentBalance: number;
  targetAmount?: string | null;
  enteredAmount?: string | null;
  monthlyAmount?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface EnvelopeStatusResult {
  canonicalType: EnvelopeType;
  fundingMode: FundingMode;
  targetAmountNum: number | null;
  progressPercentage: number | null;
  balanceStatus: EnvelopeBalanceStatus | undefined;
  progressKind: "INACTIVE" | "COVERED" | "PARTIAL" | "SHORTFALL" | "ON_TRACK" | "PERCENT" | "READY" | "ATTENTION";
}

function parseOptionalFloat(val: string | null | undefined): number | null {
  return val ? parseFloat(val) : null;
}

function resolveTargetAmount(p: EnvelopeStatusInput, canonicalType: EnvelopeType, fundingMode: FundingMode): number | null {
  if (fundingMode === "RECURRING" && canonicalType === "BILL") {
    return parseOptionalFloat(p.enteredAmount) ?? parseOptionalFloat(p.targetAmount) ?? parseOptionalFloat(p.monthlyAmount);
  }
  if (fundingMode === "RECURRING" && canonicalType === "GOAL") {
    return parseOptionalFloat(p.enteredAmount) ?? parseOptionalFloat(p.monthlyAmount) ?? parseOptionalFloat(p.targetAmount);
  }
  if (fundingMode === "TARGET_BALANCE" && canonicalType === "GOAL") {
    return parseOptionalFloat(p.targetAmount);
  }
  return parseOptionalFloat(p.targetAmount) ?? parseOptionalFloat(p.monthlyAmount) ?? parseOptionalFloat(p.enteredAmount);
}

function classifyThresholdStatus(currentBal: number, target: number): "COVERED" | "PARTIAL" | "SHORTFALL" {
  if (target <= 0 || currentBal >= target) return "COVERED";
  return currentBal > 0 ? "PARTIAL" : "SHORTFALL";
}

/**
 * Computes canonical envelope type, target amount, balance status, and progress indicator
 * shared between Web and Mobile envelope views.
 */
export function computeEnvelopeStatus(
  p: EnvelopeStatusInput,
  todayISO: string,
  nextPaydayDate: string | null,
  nextDueDate: string | null
): EnvelopeStatusResult {
  const isGoal = p.envelopeType === "GOAL";
  const isBill = p.envelopeType === "BILL";
  const isEveryday = p.envelopeType === "EVERYDAY";
  const canonicalType: EnvelopeType = isEveryday ? "EVERYDAY" : isGoal ? "GOAL" : "BILL";
  const fundingMode: FundingMode = (p.fundingMode as FundingMode) ?? (isGoal ? "TARGET_BALANCE" : "RECURRING");
  const targetAmountNum = resolveTargetAmount(p, canonicalType, fundingMode);
  const currentBal = p.currentBalance;

  if (isBill && fundingMode === "RECURRING") {
    if ((p.startDate && todayISO < p.startDate) || (p.endDate && todayISO > p.endDate)) {
      return { canonicalType, fundingMode, targetAmountNum, progressPercentage: null, balanceStatus: "INACTIVE", progressKind: "INACTIVE" };
    }
    const billTarget = targetAmountNum || 0;
    if (nextPaydayDate && nextDueDate && nextDueDate > nextPaydayDate) {
      const status = currentBal >= billTarget ? "COVERED" : "ON_TRACK";
      return { canonicalType, fundingMode, targetAmountNum, progressPercentage: null, balanceStatus: status, progressKind: status };
    }
    const status = classifyThresholdStatus(currentBal, billTarget);
    return { canonicalType, fundingMode, targetAmountNum, progressPercentage: null, balanceStatus: status, progressKind: status };
  }

  if (isBill && fundingMode === "TARGET_BALANCE") {
    const flexTarget = parseOptionalFloat(p.monthlyAmount) ?? (targetAmountNum || 0);
    const status = classifyThresholdStatus(currentBal, flexTarget);
    return { canonicalType, fundingMode, targetAmountNum, progressPercentage: null, balanceStatus: status, progressKind: status };
  }

  if (isGoal && fundingMode === "RECURRING") {
    const goalMonthly = parseOptionalFloat(p.monthlyAmount) ?? (targetAmountNum || 0);
    const status = classifyThresholdStatus(currentBal, goalMonthly);
    return { canonicalType, fundingMode, targetAmountNum, progressPercentage: 100, balanceStatus: status, progressKind: status };
  }

  if (isGoal && fundingMode === "TARGET_BALANCE") {
    const targetGoalAmt = targetAmountNum || 0;
    const balanceStatus: EnvelopeBalanceStatus =
      p.endDate && todayISO > p.endDate && currentBal < targetGoalAmt
        ? "SHORTFALL"
        : classifyThresholdStatus(currentBal, targetGoalAmt);
    const progressPercentage = targetGoalAmt > 0 ? Math.min(100, Math.round((currentBal / targetGoalAmt) * 100)) : null;
    return { canonicalType, fundingMode, targetAmountNum, progressPercentage, balanceStatus, progressKind: "PERCENT" };
  }

  return {
    canonicalType,
    fundingMode,
    targetAmountNum,
    progressPercentage: null,
    balanceStatus: undefined,
    progressKind: currentBal >= 0 ? "READY" : "ATTENTION",
  };
}
