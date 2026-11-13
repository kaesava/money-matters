import { EnvelopeType, FundingMode } from "@money-matters/types";

export type { EnvelopeType, FundingMode };

export interface EnvelopeSummaryItem {
  id: string;
  name: string;
  type?: EnvelopeType;
  poolType?: EnvelopeType;
  envelopeType: EnvelopeType;
  fundingMode?: FundingMode | null;
  isPriority?: boolean | null;
  bankAccountId?: string | null;
  bankAccountName?: string | null;
  isPrivate?: boolean | null;
  currentBalance: string;
  monthlyAmount?: string | null;
  enteredAmount?: string | null;
  targetAmount?: string | null;
  budgetFrequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY" | string | null;
  startDate?: string | null;
  rrule?: string | null;
  targetDate?: string | null;
  endDate?: string | null;
  safetyBufferFloor?: string | null;
  isSurplusTarget?: boolean | null;
  userId?: string | null;
  progressPercentage?: number;
  hasScheduledEvents?: boolean | null;
  generateEvents?: boolean | null;
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
  isPriority?: boolean;
  monthlySpent?: number;
  hasHistory?: boolean;
  hasUpcomingExpenses?: boolean;
}

export interface PoolTableRow {
  id: string;
  name: string;
  poolType?: EnvelopeType;
  envelopeType: EnvelopeType;
  fundingMode?: FundingMode | null;
  isPriority?: boolean | null;
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
  balanceStatus?: "INACTIVE" | "COVERED" | "PARTIAL" | "SHORTFALL" | "ON_TRACK";
  rawPool: CategorySummaryItem;
  hasHistory?: boolean;
  hasUpcomingExpenses?: boolean;
}
