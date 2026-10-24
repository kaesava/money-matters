import type { AssistantClassifiedIntent, AssistantResult } from "@money-matters/types";

export interface IntentContext {
  tenantId: string;
  userId: string;
}

export interface IntentHandlerPort {
  handleGoalDate(ctx: IntentContext, goalName?: string): Promise<AssistantResult>;
  handlePoolBalance(ctx: IntentContext, poolName?: string): Promise<AssistantResult>;
  handleNextPayday(ctx: IntentContext): Promise<AssistantResult>;
  handleBillsDue(ctx: IntentContext, daysAhead?: number): Promise<AssistantResult>;
  handleBillCoverage(ctx: IntentContext, billName?: string): Promise<AssistantResult>;
  handleSpendingSummary(ctx: IntentContext, categoryName?: string): Promise<AssistantResult>;
}

export interface LlmProviderPort {
  classifyIntent(userText: string): Promise<AssistantClassifiedIntent | null>;
}

export interface UsageStorePort {
  getUsage(tenantId: string): Promise<{ used: number; limit: number; remaining: number; resetsOn: string }>;
  incrementLlmCalls(tenantId: string, limit: number): Promise<boolean>;
  decrementLlmCalls?(tenantId: string): Promise<void>;
}

export interface EntityResolverPort {
  resolveEnvelope(tenantId: string, name: string): Promise<{ id: string; name: string } | null>;
  resolveBill(tenantId: string, name: string): Promise<{ id: string; name: string; amount: number } | null>;
}
