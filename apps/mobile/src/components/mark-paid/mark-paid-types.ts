export interface MarkPaidEvent {
  id: string;
  name: string;
  expectedAmount: number;
  expectedDate: string;
  poolId?: string | null;
  categoryId?: string | null;
  note?: string | null;
}

export interface FundingPoolItem {
  id: string;
  name: string;
  poolType: string;
  currentBalance: number | string;
  isSurplusTarget?: boolean | null;
}
