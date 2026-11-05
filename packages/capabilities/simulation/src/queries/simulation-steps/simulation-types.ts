import type {
  ProjectionEngineFn,
  ProjectionEngineBucket,
  ProjectionIncomeEvent,
  ProjectionExpenseEvent,
} from "@money-matters/types";

export interface SimulationEnvelopeItem {
  id: string;
  name: string;
  envelopeType: "EVERYDAY" | "SCHEDULED_BILL" | "FLEXIBLE_BILL" | "TARGET_GOAL" | "ONGOING_GOAL";
  bankAccountId: string | null;
  safetyBufferFloor: string | null;
  goalMode: "TARGET_DATE" | "ONGOING" | null;
  enteredAmount: string | null;
  monthlyAmount: string | null;
  targetAmount: string | null;
  endDate: string | null;
  isCommitted: boolean | null;
  isSurplusTarget: boolean | null;
  isPrivate: boolean | null;
  userId: string | null;
}

export interface SimulationPendingExpense {
  id: string;
  name: string;
  expectedDate: string;
  expectedAmount: string;
  envelopeId: string | null;
  status: string;
}

export interface SimulationSortedIncome {
  id: string;
  sourceName: string;
  expectedDate: string;
  expectedAmount: string;
  actualAmount: string | null;
  status: string;
  rrule: string | null;
}

export interface RecurringSimulationParams {
  amount: number;
  frequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY";
  itemName?: string;
  effectiveSpendable: number;
  everydayBalance: number;
  safeCushion: string;
  daysUntilPayday: number;
  nextPaycheckDateStr: string;
  totalBillsBeforePayday: number;
  visibleEnvelopes: SimulationEnvelopeItem[];
  goalEnvelopes: SimulationEnvelopeItem[];
  everydayEnvelopes: SimulationEnvelopeItem[];
  engineBuckets: ProjectionEngineBucket[];
  envelopeBalancesMap: Record<string, number>;
  pendingExpensesRaw: SimulationPendingExpense[];
  sortedIncomes: SimulationSortedIncome[];
  projectionEngine: ProjectionEngineFn;
  today: Date;
  timezone: string;
}

export interface OneOffSimulationParams {
  amount: number;
  includePersonal: boolean;
  effectiveSpendable: number;
  everydayBalance: number;
  safeCushion: string;
  safeCushionVal: number;
  daysUntilPayday: number;
  nextPaycheckDateStr: string;
  totalBillsBeforePayday: number;
  billsDueBeforePayday: SimulationPendingExpense[];
  goalEnvelopes: SimulationEnvelopeItem[];
  everydayEnvelopes: SimulationEnvelopeItem[];
  visibleEnvelopes: SimulationEnvelopeItem[];
  engineBuckets: ProjectionEngineBucket[];
  envelopeBalancesMap: Record<string, number>;
  pendingExpensesRaw: SimulationPendingExpense[];
  sortedIncomes: SimulationSortedIncome[];
  dailyAllowance: number;
  projectionEngine: ProjectionEngineFn;
  timezone: string;
}
