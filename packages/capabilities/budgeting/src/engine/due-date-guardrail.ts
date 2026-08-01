/**
 * Due-Date Guardrail Engine
 * 
 * Evaluates whether the current Unified Bills Pool balance is sufficient to cover
 * upcoming bill commitments due within a specified lookahead window (default 14 days).
 * 
 * Prevents lump-sum bill shocks (e.g., Car Insurance, Council Rates) in a pooled model.
 */

export interface UpcomingBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // ISO date string YYYY-MM-DD
}

export interface DueDateGuardrailInput {
  currentBillsPoolBalance: number;
  upcomingBills: UpcomingBill[];
  lookaheadDays?: number; // Defaults to 14
}

export interface DueDateGuardrailOutput {
  status: "HEALTHY" | "SHORTFALL_ALERT";
  currentBalance: number;
  requiredAmount: number;
  shortfallAmount: number;
  affectedBills: UpcomingBill[];
}

export function evaluateBillsPoolHealth(input: DueDateGuardrailInput): DueDateGuardrailOutput {
  const lookahead = input.lookaheadDays ?? 14;
  const now = new Date();
  const cutoff = new Date(now.getTime() + lookahead * 24 * 60 * 60 * 1000);

  // Filter bills due between now and cutoff
  const relevantBills = input.upcomingBills.filter((bill) => {
    const due = new Date(bill.dueDate);
    return due <= cutoff;
  });

  const requiredAmount = relevantBills.reduce((sum, bill) => sum + bill.amount, 0);
  const shortfallAmount = Math.max(0, requiredAmount - Math.max(0, input.currentBillsPoolBalance));

  return {
    status: shortfallAmount > 0 ? "SHORTFALL_ALERT" : "HEALTHY",
    currentBalance: input.currentBillsPoolBalance,
    requiredAmount,
    shortfallAmount,
    affectedBills: relevantBills,
  };
}
