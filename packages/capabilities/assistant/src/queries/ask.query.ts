import { isFeatureEnabled } from "@money-matters/config";
import type { AssistantResult, AssistantClassifiedIntent } from "@money-matters/types";
import { matchDeterministicIntent } from "../matcher/deterministic.matcher.js";
import type {
  IntentHandlerPort,
  LlmProviderPort,
  UsageStorePort,
  IntentContext,
} from "../ports/index.js";

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

const DEFAULT_SUGGESTIONS = [
  "How much is left in Everyday?",
  "When is my next payday?",
  "Which bills are due this week?",
];

function sanitizeAnswerText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, "")
    .trim()
    .slice(0, 600);
}

function buildClarifyResult(): AssistantResult {
  return {
    type: "clarify",
    templateKey: "assistant.clarify.generic",
    suggestions: DEFAULT_SUGGESTIONS,
  };
}

async function resolveLlmQuery(opts: AskAssistantOptions): Promise<AssistantResult> {
  const { query, context, handler, llmProvider, usageStore } = opts;
  const snapshot = handler.buildSafeContext ? await handler.buildSafeContext(context) : undefined;

  let outcome;
  try {
    outcome = await llmProvider.classifyIntent(query, snapshot);
  } catch (err) {
    if (typeof usageStore.decrementLlmCalls === "function") {
      await usageStore.decrementLlmCalls(context.tenantId);
    }
    throw err;
  }

  if (!outcome.ok) {
    if (typeof usageStore.decrementLlmCalls === "function") {
      await usageStore.decrementLlmCalls(context.tenantId);
    }
    return { type: "unavailable", reason: "service_error" };
  }

  const { response } = outcome;
  if (response.mode === "refuse") {
    return { type: "answer", templateKey: "assistant.answers.outOfScope" };
  }
  if (response.mode === "answer") {
    const clean = sanitizeAnswerText(response.text);
    return clean ? { type: "answer", text: clean } : buildClarifyResult();
  }
  if (response.intent === "UNKNOWN") {
    return buildClarifyResult();
  }
  return executeIntent(response.intent, response.params, context, handler);
}

export async function askAssistant(opts: AskAssistantOptions): Promise<AssistantResult> {
  const { query, context, appId, isGracePeriod, isExpired, handler, usageStore } = opts;

  if (!isFeatureEnabled("aiAssistant", appId)) {
    return { type: "unavailable", reason: "disabled" };
  }
  if (isExpired) {
    return { type: "unavailable", reason: "subscription_required" };
  }

  const deterministicIntent = matchDeterministicIntent(query, context.timezone);
  if (deterministicIntent && deterministicIntent.confidence >= 0.9) {
    return executeIntent(deterministicIntent.intent, deterministicIntent.params, context, handler);
  }

  if (isGracePeriod) {
    return { type: "unavailable", reason: "read_only_grace" };
  }

  const usage = await usageStore.getUsage(context.tenantId);
  if (usage.remaining <= 0) {
    return { type: "unavailable", reason: "quota_exceeded" };
  }

  const allowed = await usageStore.incrementLlmCalls(context.tenantId, usage.limit);
  if (!allowed) {
    return { type: "unavailable", reason: "quota_exceeded" };
  }

  return resolveLlmQuery(opts);
}

function buildCrudPrefill(
  params: AssistantClassifiedIntent["params"]
): Extract<AssistantResult, { type: "prefill" }> {
  const entityType = params.categoryName?.toLowerCase();
  const target =
    entityType === "bill"
      ? "create-bill"
      : entityType === "income"
        ? "create-income"
        : "create-envelope";
  return {
    type: "prefill",
    target,
    params: {
      name: params.entityName ?? "",
      amount: params.amount ?? 0,
      date: params.date ?? "",
    },
  };
}

async function resolveEditIntent(
  params: AssistantClassifiedIntent["params"],
  context: IntentContext,
  handler: IntentHandlerPort
): Promise<AssistantResult> {
  const rawType = params.categoryName?.toLowerCase();
  const entityType = rawType === "bill" ? "bill" : rawType === "income" ? "income" : "envelope";
  if (handler.resolveEditTarget) {
    return handler.resolveEditTarget(context, entityType, params.entityName);
  }
  return {
    type: "prefill",
    target: "navigate",
    params: { screen: entityType === "envelope" ? "envelopes" : "plan" },
  };
}

function buildTransactionOrActionPrefill(
  intent: string,
  params: AssistantClassifiedIntent["params"]
): AssistantResult | null {
  switch (intent) {
    case "CAN_I_AFFORD":
      return { type: "prefill", target: "afford-check", params: { amount: params.amount ?? 0, date: params.date ?? "" } };
    case "RECORD_BILL_PAYMENT":
      return { type: "prefill", target: "mark-paid", params: { billName: params.entityName ?? "", amount: params.amount ?? 0, date: params.date ?? "" } };
    case "RECORD_TRANSACTION":
      return { type: "prefill", target: "add-transaction", params: { merchant: params.entityName ?? "", amount: params.amount ?? 0, date: params.date ?? "" } };
    case "TRANSFER_FUNDS":
      return { type: "prefill", target: "transfer", params: { amount: params.amount ?? 0, sourceAccount: params.sourceAccount ?? "", destinationAccount: params.destinationAccount ?? "" } };
    case "ADD_ENTITY":
      return buildCrudPrefill(params);
    case "NAVIGATE_HELP":
      return { type: "prefill", target: "navigate", params: { screen: params.targetScreen ?? "home" } };
    default:
      return null;
  }
}

async function executeIntent(
  intent: string,
  params: AssistantClassifiedIntent["params"],
  context: IntentContext,
  handler: IntentHandlerPort
): Promise<AssistantResult> {
  const prefill = buildTransactionOrActionPrefill(intent, params);
  if (prefill) return prefill;

  switch (intent) {
    case "GREETING_HELP":
      return { type: "answer", templateKey: "assistant.answers.greetingHelp" };
    case "OUT_OF_SCOPE":
      return { type: "answer", templateKey: "assistant.answers.outOfScope" };
    case "GOAL_ACHIEVEMENT_DATE":
      return handler.handleGoalDate(context, params.entityName);
    case "POOL_BALANCE":
      return handler.handlePoolBalance(context, params.entityName);
    case "NEXT_PAYDAY_ALLOCATION":
      return handler.handleNextPayday(context);
    case "BILLS_DUE":
      return handler.handleBillsDue(context, params.daysAhead);
    case "BILL_PAYMENT_STATUS":
      return handler.handleBillCoverage(context, params.entityName);
    case "SPENDING_SUMMARY":
      return handler.handleSpendingSummary(context, params.categoryName);
    case "EDIT_ENTITY":
      return resolveEditIntent(params, context, handler);
    default:
      return buildClarifyResult();
  }
}
