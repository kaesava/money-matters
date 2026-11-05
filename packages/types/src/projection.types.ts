import type { EnvelopeType } from "./envelope.types.js";

/**
 * Port interfaces for Cumulative Waterfall Projection Engine (IoC boundary)
 */
export interface ProjectionEngineBucket {
  id: string;
  name: string;
  type: EnvelopeType | "REGULAR" | "GOAL";
  envelopeType?: string;
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

export interface ProjectionIncomeEvent {
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

export interface ProjectionExpenseEvent {
  categoryId?: string | null;
  poolId?: string | null;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: "PENDING" | "CONFIRMED";
}

export interface ProjectionTimelineStep {
  incomeEvent: ProjectionIncomeEvent;
  date: string;
  totalIncome: number;
  balancesBeforeAlloc: Map<string, number>;
  allocations: Map<string, { proposedAmount: number; reasoning: string; isOverride: boolean }>;
  balancesAfterAlloc: Map<string, number>;
  deductedExpenses: Array<{ bucketId: string; amount: number; dueDate: string }>;
  balancesAfterExpenses: Map<string, number>;
  minProjectedBalances: Map<string, number>;
}

export interface ProjectionOutput {
  steps: ProjectionTimelineStep[];
  finalBalances: Map<string, number>;
  getStepForEvent(incomeEventId: string): ProjectionTimelineStep | undefined;
}

export type ProjectionEngineFn = (input: {
  categories: ProjectionEngineBucket[];
  incomeEvents: ProjectionIncomeEvent[];
  expenseEvents?: ProjectionExpenseEvent[];
  cellOverrides?: Record<string, number>;
  currentUserId?: string;
}) => ProjectionOutput;

/**
 * Returns the ID of the earliest pending income event (sorted chronologically by expectedDate).
 * A pending income event is one that is not confirmed/processed (status !== "CONFIRMED").
 */
export function getEarliestPendingIncomeId<T extends { id: string; expectedDate: string; status?: string }>(
  incomeItems: readonly T[] | T[]
): string | null {
  if (!incomeItems || incomeItems.length === 0) return null;
  const pending = incomeItems.filter((item) => item.status !== "CONFIRMED");
  if (pending.length === 0) return null;
  const sorted = [...pending].sort(
    (a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime()
  );
  return sorted[0].id;
}
