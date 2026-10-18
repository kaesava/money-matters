import { isFeatureEnabled } from "@money-matters/config";
import type { AssistantResult } from "@money-matters/types";
import { matchDeterministicIntent } from "../matcher/deterministic.matcher.js";
import type { IntentHandlerPort, LlmProviderPort, UsageStorePort, IntentContext } from "../ports/index.js";

export interface AskAssistantOptions {
  query: string;
  context: IntentContext;
  appId: string;
  isGracePeriod?: boolean;
  isExpired?: boolean;
  handler: IntentHandlerPort;
  llmProvider: LlmProviderPort;
  usageStore: UsageStorePort;
}

export async function askAssistant(opts: AskAssistantOptions): Promise<AssistantResult> {
  const { query, context, appId, isGracePeriod, isExpired, handler, llmProvider, usageStore } = opts;

  // 1. Feature Flag Check
  if (!isFeatureEnabled("aiAssistant", appId)) {
    return { type: "unavailable", reason: "disabled" };
  }

  // 2. Lifecycle Status Check
  if (isExpired) {
    return { type: "unavailable", reason: "disabled" };
  }

  // 3. Deterministic Match First ($0 cost, immediate resolution)
  const deterministicIntent = matchDeterministicIntent(query);
  if (deterministicIntent && deterministicIntent.confidence >= 0.9) {
    return executeIntent(deterministicIntent.intent, deterministicIntent.params, context, handler);
  }

  // 4. In 7-day read-only grace period, LLM fallback is disabled
  if (isGracePeriod) {
    return { type: "unavailable", reason: "read_only_grace" };
  }

  // 5. Quota Check & Atomic Increment
  const usage = await usageStore.getUsage(context.tenantId);
  if (usage.remaining <= 0) {
    return { type: "unavailable", reason: "quota_exceeded" };
  }

  const allowed = await usageStore.incrementLlmCalls(context.tenantId, usage.limit);
  if (!allowed) {
    return { type: "unavailable", reason: "quota_exceeded" };
  }

  // 6. LLM Fallback Classification
  const classified = await llmProvider.classifyIntent(query);
  if (!classified || classified.intent === "UNKNOWN") {
    return {
      type: "clarify",
      templateKey: "assistant.clarify.generic",
      suggestions: [
        "How much is left in my Everyday pool?",
        "When is my next payday?",
        "Which bills are due this week?",
      ],
    };
  }

  return executeIntent(classified.intent, classified.params, context, handler);
}

async function executeIntent(
  intent: string,
  params: any,
  context: IntentContext,
  handler: IntentHandlerPort
): Promise<AssistantResult> {
  switch (intent) {
    case "GOAL_ACHIEVEMENT_DATE":
      return handler.handleGoalDate(context, params.entityName);
    case "CAN_I_AFFORD":
      return {
        type: "prefill",
        target: "afford-check",
        params: {
          amount: params.amount ?? 0,
          date: params.date ?? "",
        },
      };
    case "POOL_BALANCE":
      return handler.handlePoolBalance(context, params.entityName);
    case "NEXT_PAYDAY_ALLOCATION":
      return handler.handleNextPayday(context);
    case "BILLS_DUE":
      return handler.handleBillsDue(context, params.daysAhead);
    case "BILL_PAYMENT_STATUS":
      return handler.handleBillCoverage(context, params.entityName);
    case "RECORD_BILL_PAYMENT":
      return {
        type: "prefill",
        target: "mark-paid",
        params: {
          billName: params.entityName ?? "",
          amount: params.amount ?? 0,
          date: params.date ?? "",
        },
      };
    case "RECORD_TRANSACTION":
      return {
        type: "prefill",
        target: "add-transaction",
        params: {
          merchant: params.entityName ?? "",
          amount: params.amount ?? 0,
          date: params.date ?? "",
        },
      };
    case "TRANSFER_FUNDS":
      return {
        type: "prefill",
        target: "transfer",
        params: {
          amount: params.amount ?? 0,
          sourceAccount: params.sourceAccount ?? "",
          destinationAccount: params.destinationAccount ?? "",
        },
      };
    case "SPENDING_SUMMARY":
      return handler.handleSpendingSummary(context, params.categoryName);
    case "NAVIGATE_HELP":
      return {
        type: "prefill",
        target: "navigate",
        params: { screen: params.targetScreen ?? "dashboard" },
      };
    default:
      return {
        type: "clarify",
        templateKey: "assistant.clarify.generic",
        suggestions: ["How much is in Everyday?", "When is my next payday?"],
      };
  }
}
