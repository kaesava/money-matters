import type { RecurrenceFrequency } from "@money-matters/ui/mobile";

export interface EnvelopeItem {
  id: string;
  name: string;
  type: "GOAL" | "BILL" | "EVERYDAY" | string;
  poolType?: string;
  envelopeType?: string;
  targetAmount?: string | null;
  targetDate?: string | null;
  endDate?: string | null;
  enteredAmount?: string | null;
  budgetFrequency?: RecurrenceFrequency | string | null;
  startDate?: string | null;
  rrule?: string | null;
  monthlyAmount?: string | null;
  everydayTargetKeepAmount?: string | null;
  bankAccountId?: string | null;
  currentBalance?: string;
  safetyBufferFloor?: string | null;
  healthStatus?: string | null;
  isSurplusTarget?: boolean | null;
  generateEvents?: boolean | null;
  hasScheduledEvents?: boolean | null;
  fundingMode?: "TARGET_BALANCE" | "RECURRING" | null;
  isPriority?: boolean | null;
  isPrivate?: boolean | null;
}

export interface EnvelopeDraftPayload {
  name: string;
  type: "GOAL" | "BILL" | "EVERYDAY";
  envelopeType: "EVERYDAY" | "BILL" | "GOAL";
  fundingMode?: "TARGET_BALANCE" | "RECURRING";
  safetyBufferFloor?: string;
  monthlyAmount?: string;
  enteredAmount?: string;
  targetAmount?: string;
  endDate?: string | null;
  budgetFrequency?: RecurrenceFrequency;
  startDate?: string;
  rrule?: string;
  isSurplusTarget?: boolean;
  isPriority?: boolean;
  bankAccountId?: string;
  generateEvents?: boolean;
}

export interface EnvelopeFormModalProps {
  visible: boolean;
  envelopeToEdit?: EnvelopeItem | null;
  categoryToEdit?: EnvelopeItem | null;
  defaultType?: "GOAL" | "BILL" | "EVERYDAY";
  bankAccounts?: Array<{
    id: string;
    name: string;
    isPrivate?: boolean | null;
  }>;
  onSaveDraft?: (draft: EnvelopeDraftPayload) => void;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: "ALL" | "BILL_SCHEDULE";
}
