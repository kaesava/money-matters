export interface EnvelopeModalItem {
  id: string;
  poolId?: string;
  name: string;
  type?: "EVERYDAY" | "BILL" | "GOAL" | string;
  envelopeType?: string;
  fundingMode?: "TARGET_BALANCE" | "RECURRING" | null;
  bankAccountId?: string | null;
  isPrivate?: boolean | null;
  monthlyAmount?: string | null;
  safetyBufferFloor?: string | null;
  targetAmount?: string | null;
  endDate?: string | null;
  targetDate?: string | null;
  enteredAmount?: string | null;
  budgetFrequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY" | string | null;
  startDate?: string | null;
  rrule?: string | null;
  isSurplusTarget?: boolean | null;
  generateEvents?: boolean | null;
  hasScheduledEvents?: boolean | null;
  isPriority?: boolean | null;
  currentBalance?: string | number | null;
}

export interface UseEnvelopeFormModalStateParams {
  isOpen: boolean;
  categoryToEdit?: EnvelopeModalItem | null;
  bankAccounts: Array<{ id: string; name: string; isPrivate?: boolean | null }>;
}
