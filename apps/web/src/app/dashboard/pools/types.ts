export interface CategorySummaryItem {
  id: string;
  name: string;
  type: "REGULAR" | "GOAL" | "EVERYDAY";
  poolType?: "REGULAR" | "GOAL" | "EVERYDAY";
  isPrivate?: boolean | null;
  currentBalance: string;
  monthlyAmount?: string | null;
  everydayAllowanceAmount?: string | null;
  targetAmount?: string | null;
  targetDate?: string | null;
  healthStatus?: string | null;
  isEssential?: boolean | null;
  isSurplusTarget?: boolean | null;
  userId?: string | null;
}

export interface CategoryItem {
  id: string;
  poolId: string;
  name: string;
  monthlyAmount?: string | null;
  enteredAmount?: string | null;
  budgetFrequency?: string | null;
  isEssential?: boolean;
  monthlySpent?: number;
}

export interface PoolTableRow {
  id: string;
  name: string;
  poolType: "EVERYDAY" | "REGULAR" | "GOAL";
  isPrivate?: boolean | null;
  currentBalance: number;
  targetAmount: number | null;
  targetDate: string | null;
  categoryCount: number;
  categories: CategoryItem[];
  progressText: string;
  progressPercentage?: number | null;
  rawPool: CategorySummaryItem;
}
