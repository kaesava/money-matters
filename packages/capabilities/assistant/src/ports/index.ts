import type { AssistantLlmResponse, AssistantResult } from "@money-matters/types";

export interface IntentContext {
  tenantId: string;
  userId: string;
  currency?: string;
  locale?: string;
  timezone?: string;
}

export interface SafePennyEnvelopeSummary {
  name: string;
  type: string;
  balance: string;
  monthlyBudget?: string;
  targetAmount?: string;
  endDate?: string;
}

export interface SafePennyEventSummary {
  name: string;
  amount: string;
  date: string;
  status: string;
}

export interface SafePennySnapshot {
  currency: string;
  timezone: string;
  todayIso: string;
  everydaySafeToSpend: string;
  envelopes: SafePennyEnvelopeSummary[];
  upcomingBills: SafePennyEventSummary[];
  upcomingIncome: SafePennyEventSummary[];
}

export type LlmClassificationOutcome =
  | { ok: true; response: AssistantLlmResponse }
  | { ok: false; reason: "gateway_error" | "missing_config" };

export interface IntentHandlerPort {
  handleGoalDate(ctx: IntentContext, goalName?: string): Promise<AssistantResult>;
  handlePoolBalance(ctx: IntentContext, poolName?: string): Promise<AssistantResult>;
  handleNextPayday(ctx: IntentContext): Promise<AssistantResult>;
  handleBillsDue(ctx: IntentContext, daysAhead?: number): Promise<AssistantResult>;
  handleBillCoverage(ctx: IntentContext, billName?: string): Promise<AssistantResult>;
  handleSpendingSummary(ctx: IntentContext, categoryName?: string): Promise<AssistantResult>;
  buildSafeContext?(ctx: IntentContext): Promise<SafePennySnapshot>;
  resolveEditTarget?(
    ctx: IntentContext,
    entityType: "envelope" | "bill" | "income",
    entityName?: string
  ): Promise<AssistantResult>;
}

export interface LlmProviderPort {
  classifyIntent(
    userText: string,
    snapshot?: SafePennySnapshot
  ): Promise<LlmClassificationOutcome>;
}

export interface UsageStorePort {
  getUsage(tenantId: string): Promise<{ used: number; limit: number; remaining: number; resetsOn: string }>;
  incrementLlmCalls(tenantId: string, limit: number): Promise<boolean>;
  decrementLlmCalls?(tenantId: string): Promise<void>;
}
