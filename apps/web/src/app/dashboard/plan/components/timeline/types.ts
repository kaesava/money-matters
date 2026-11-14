export interface EventItem {
  id: string;
  expectedDate: string;
  expectedAmount: string;
  actualAmount?: string | null;
  status: string;
  incomeSourceId?: string | null;
  expenseSourceId?: string | null;
  name?: string | null;
  note?: string | null;
  contributionMode?: string | null;
  contributionValue?: string | null;
}

export interface TimelineEventItem extends EventItem {
  eventKind?: "INCOME" | "EXPENSE" | "TRANSFER";
  name?: string | null;
  note?: string | null;
  poolId?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  sourcePoolId?: string | null;
  sourcePoolName?: string | null;
  destinationPoolId?: string | null;
  destinationPoolName?: string | null;
  isPrivate?: boolean;
}
