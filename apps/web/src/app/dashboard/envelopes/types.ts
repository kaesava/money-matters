export type EnvelopeType = "EVERYDAY" | "SCHEDULED_BILL" | "FLEXIBLE_BILL" | "TARGET_GOAL" | "ONGOING_GOAL";

export interface EnvelopeSummaryItem {
  id: string;
  name: string;
  type?: "REGULAR" | "GOAL" | "EVERYDAY" | EnvelopeType;
  poolType?: "REGULAR" | "GOAL" | "EVERYDAY" | EnvelopeType;
  envelopeType: EnvelopeType;
  bankAccountId?: string | null;
  bankAccountName?: string | null;
  isPrivate?: boolean | null;
  currentBalance: string;
  monthlyAmount?: string | null;
  targetAmount?: string | null;
  targetDate?: string | null;
  endDate?: string | null;
  safetyBufferFloor?: string | null;
  goalMode?: "TARGET_DATE" | "ONGOING" | null;
  isEssential?: boolean | null;
  isSurplusTarget?: boolean | null;
  userId?: string | null;
  progressPercentage?: number;
}

export type CategorySummaryItem = EnvelopeSummaryItem;

export interface CategoryItem {
  id: string;
  poolId?: string;
  envelopeId?: string;
  name: string;
  monthlyAmount?: string | null;
  enteredAmount?: string | null;
  budgetFrequency?: string | null;
  isEssential?: boolean;
  monthlySpent?: number;
  hasHistory?: boolean;
  hasUpcomingExpenses?: boolean;
}

export interface PoolTableRow {
  id: string;
  name: string;
  poolType?: "EVERYDAY" | "REGULAR" | "GOAL" | EnvelopeType;
  envelopeType: EnvelopeType;
  bankAccountId?: string | null;
  bankAccountName?: string | null;
  isPrivate?: boolean | null;
  currentBalance: number;
  targetAmount: number | null;
  targetDate: string | null;
  endDate?: string | null;
  safetyBufferFloor?: number | null;
  categoryCount?: number;
  categories?: CategoryItem[];
  progressText: string;
  progressPercentage?: number | null;
  rawPool: CategorySummaryItem;
  hasHistory?: boolean;
  hasUpcomingExpenses?: boolean;
}
