import {
  SpendingTimeframe,
  IncomeSplitAnalyticsDTO,
  HorizonBreakdownDTO,
  TopOutflowPoolDTO,
  MonthlyCashFlowPointDTO,
} from "@money-matters/types";
import {
  initializeBuckets,
  resolvePointKey,
} from "./income-split-analytics-buckets";

export interface ProcessedPlan {
  id: string;
  date: Date;
  totalIncomeAmount: number;
}

export interface ProcessedLine {
  planId: string;
  envelopeId: string;
  envelopeName: string;
  envelopeType: "EVERYDAY" | "SCHEDULED_BILL" | "FLEXIBLE_BILL" | "TARGET_GOAL" | "ONGOING_GOAL";
  amount: number;
}

export interface RawPlanInput {
  id: string;
  totalIncomeAmount: string;
  expectedDate: string | null;
  actualDate: string | null;
  createdAt: Date;
}

export interface RawLineInput {
  planId: string;
  envelopeId: string;
  proposedAmount: string;
  confirmedAmount: string | null;
  envelopeName: string | null;
  envelopeType: "EVERYDAY" | "SCHEDULED_BILL" | "FLEXIBLE_BILL" | "TARGET_GOAL" | "ONGOING_GOAL" | null;
}

export function parsePlanDate(raw: { actualDate: string | null; expectedDate: string | null; createdAt: Date }): Date {
  const dateStr = raw.actualDate || raw.expectedDate;
  if (!dateStr) return new Date(raw.createdAt);
  return new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00Z`);
}

export function buildIncomeSplitAnalytics({
  rawPlans,
  rawLines,
  defaultSweepId,
  timeframe,
  cutoffDate,
  refDate,
  isFiltered,
  envelopeIdFilter,
}: {
  rawPlans: RawPlanInput[];
  rawLines: RawLineInput[];
  defaultSweepId: string;
  timeframe: SpendingTimeframe;
  cutoffDate: Date;
  refDate: Date;
  isFiltered: boolean;
  envelopeIdFilter?: string;
}): IncomeSplitAnalyticsDTO {
  const plans: ProcessedPlan[] = rawPlans.map((p) => ({
    id: p.id,
    date: parsePlanDate(p),
    totalIncomeAmount: parseFloat(p.totalIncomeAmount) || 0,
  }));

  const lines: ProcessedLine[] = rawLines.map((l) => ({
    planId: l.planId,
    envelopeId: l.envelopeId,
    envelopeName: l.envelopeName ?? "Unknown Envelope",
    envelopeType: l.envelopeType ?? "EVERYDAY",
    amount: parseFloat(l.confirmedAmount ?? l.proposedAmount) || 0,
  }));

  const totalIncome = plans.reduce((acc, p) => acc + p.totalIncomeAmount, 0);
  const totalAllocated = lines.reduce((acc, l) => acc + l.amount, 0);

  if (plans.length === 0 || totalAllocated <= 0) {
    return createEmptyIncomeSplitAnalytics(timeframe, isFiltered);
  }

  const horizonBreakdown = computeHorizonBreakdown(lines);
  const monthlyCashFlow = computeMonthlyCashFlow(plans, lines, defaultSweepId, timeframe, cutoffDate, refDate);
  const { topPools, otherPoolsAmount } = computeTopPools(lines, totalAllocated);

  let filteredSharePercentage = 0;
  if (isFiltered && envelopeIdFilter) {
    const matched = lines.filter((l) => l.envelopeId === envelopeIdFilter);
    const matchedAmount = matched.reduce((acc, l) => acc + l.amount, 0);
    filteredSharePercentage = totalAllocated > 0 ? Math.round((matchedAmount / totalAllocated) * 10000) / 100 : 0;
  }

  return {
    timeframe,
    totalOutflow: Math.round(totalAllocated * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    horizonBreakdown,
    monthlyCashFlow,
    topPools,
    otherPoolsAmount,
    isEmpty: false,
    isFiltered,
    filteredSharePercentage,
    topPayees: [],
    isTransferOnly: false,
  };
}

export function createEmptyIncomeSplitAnalytics(timeframe: SpendingTimeframe, isFiltered: boolean): IncomeSplitAnalyticsDTO {
  return {
    timeframe,
    totalOutflow: 0,
    totalIncome: 0,
    horizonBreakdown: {
      everyday: 0,
      bills: 0,
      goals: 0,
      totalOutflow: 0,
      percentages: { everyday: 0, bills: 0, goals: 0 },
    },
    monthlyCashFlow: [],
    topPools: [],
    otherPoolsAmount: 0,
    isEmpty: true,
    isFiltered,
    filteredSharePercentage: 0,
    topPayees: [],
    isTransferOnly: false,
  };
}

export function computeHorizonBreakdown(lines: ProcessedLine[]): HorizonBreakdownDTO {
  let everyday = 0;
  let bills = 0;
  let goals = 0;

  for (const line of lines) {
    if (line.envelopeType === "EVERYDAY") {
      everyday += line.amount;
    } else if (
      line.envelopeType === "SCHEDULED_BILL" ||
      line.envelopeType === "FLEXIBLE_BILL" ||
      (line.envelopeType as string) === "REGULAR"
    ) {
      bills += line.amount;
    } else {
      goals += line.amount;
    }
  }

  const total = everyday + bills + goals;
  if (total <= 0) {
    return {
      everyday: 0,
      bills: 0,
      goals: 0,
      totalOutflow: 0,
      percentages: { everyday: 0, bills: 0, goals: 0 },
    };
  }

  const pEveryday = Math.round((everyday / total) * 100);
  const pBills = Math.round((bills / total) * 100);
  const pGoals = Math.max(100 - pEveryday - pBills, 0);

  return {
    everyday: Math.round(everyday * 100) / 100,
    bills: Math.round(bills * 100) / 100,
    goals: Math.round(goals * 100) / 100,
    totalOutflow: Math.round(total * 100) / 100,
    percentages: { everyday: pEveryday, bills: pBills, goals: pGoals },
  };
}

export function computeMonthlyCashFlow(
  plans: ProcessedPlan[],
  lines: ProcessedLine[],
  defaultSweepId: string,
  timeframe: SpendingTimeframe,
  cutoffDate: Date,
  refDate: Date
): MonthlyCashFlowPointDTO[] {
  const buckets = initializeBuckets(timeframe, refDate);
  const sweepLinesByPlan = new Map<string, number>();

  for (const line of lines) {
    if (line.envelopeId === defaultSweepId) {
      sweepLinesByPlan.set(line.planId, (sweepLinesByPlan.get(line.planId) || 0) + line.amount);
    }
  }

  for (const plan of plans) {
    const key = resolvePointKey(timeframe, plan.date, cutoffDate);
    const bucket = buckets.get(key);
    if (!bucket) continue;

    bucket.income += plan.totalIncomeAmount;
    bucket.outflow += sweepLinesByPlan.get(plan.id) || 0;
  }

  return Array.from(buckets.values()).map((b) => ({
    monthKey: b.key,
    label: b.label,
    income: Math.round(b.income * 100) / 100,
    outflow: Math.round(b.outflow * 100) / 100,
    net: Math.round((b.income - b.outflow) * 100) / 100,
  }));
}

export function computeTopPools(
  lines: ProcessedLine[],
  totalAllocated: number
): { topPools: TopOutflowPoolDTO[]; otherPoolsAmount: number } {
  const map = new Map<string, { id: string; name: string; amount: number }>();

  for (const line of lines) {
    const existing = map.get(line.envelopeId);
    if (existing) {
      existing.amount += line.amount;
    } else {
      map.set(line.envelopeId, { id: line.envelopeId, name: line.envelopeName, amount: line.amount });
    }
  }

  const sorted = Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  const top5 = sorted.slice(0, 5);
  const otherAmount = sorted.slice(5).reduce((acc, curr) => acc + curr.amount, 0);

  const topPools: TopOutflowPoolDTO[] = top5.map((pool) => ({
    id: pool.id,
    name: pool.name,
    amount: Math.round(pool.amount * 100) / 100,
    percentage: totalAllocated > 0 ? Math.round((pool.amount / totalAllocated) * 10000) / 100 : 0,
  }));

  return {
    topPools,
    otherPoolsAmount: Math.round(otherAmount * 100) / 100,
  };
}
