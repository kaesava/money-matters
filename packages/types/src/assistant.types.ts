import { z } from "zod";

/**
 * 12 canonical intents supported by Penny AI Assistant
 */
export const AssistantIntentEnum = z.enum([
  "GOAL_ACHIEVEMENT_DATE",
  "CAN_I_AFFORD",
  "POOL_BALANCE",
  "NEXT_PAYDAY_ALLOCATION",
  "BILLS_DUE",
  "BILL_PAYMENT_STATUS",
  "RECORD_BILL_PAYMENT",
  "RECORD_TRANSACTION",
  "TRANSFER_FUNDS",
  "SPENDING_SUMMARY",
  "ADD_ENTITY",
  "NAVIGATE_HELP",
  "UNKNOWN",
]);
export type AssistantIntent = z.infer<typeof AssistantIntentEnum>;

/**
 * Classifier output schema extracted from LLM or deterministic rule-engine
 */
export const AssistantClassifiedIntentSchema = z
  .object({
    intent: AssistantIntentEnum,
    confidence: z.number().min(0).max(1),
    params: z
      .object({
        entityName: z.string().optional(),
        amount: z.number().positive().optional(),
        date: z.string().optional(), // YYYY-MM-DD
        daysAhead: z.number().int().positive().optional(),
        targetScreen: z.string().optional(),
        sourceAccount: z.string().optional(),
        destinationAccount: z.string().optional(),
        categoryName: z.string().optional(),
      })
      .strict(),
  })
  .strict();
export type AssistantClassifiedIntent = z.infer<typeof AssistantClassifiedIntentSchema>;

/**
 * Discriminator result returned to UI client
 */
export const AssistantAnswerResultSchema = z
  .object({
    type: z.literal("answer"),
    templateKey: z.string(),
    templateValues: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  })
  .strict();

export const AssistantPrefillResultSchema = z
  .object({
    type: z.literal("prefill"),
    target: z.enum([
      "afford-check",
      "mark-paid",
      "add-transaction",
      "transfer",
      "history-filter",
      "create-bill",
      "create-income",
      "create-envelope",
      "navigate",
    ]),
    params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  })
  .strict();

export const AssistantClarifyResultSchema = z
  .object({
    type: z.literal("clarify"),
    templateKey: z.string(),
    suggestions: z.array(z.string()),
  })
  .strict();

export const AssistantUnavailableResultSchema = z
  .object({
    type: z.literal("unavailable"),
    reason: z.enum(["quota_exceeded", "read_only_grace", "disabled", "rate_limited", "unauthenticated"]),
  })
  .strict();

export const AssistantResultSchema = z.discriminatedUnion("type", [
  AssistantAnswerResultSchema,
  AssistantPrefillResultSchema,
  AssistantClarifyResultSchema,
  AssistantUnavailableResultSchema,
]);
export type AssistantResult = z.infer<typeof AssistantResultSchema>;

/**
 * Ask query request input
 */
export const AssistantAskInputSchema = z
  .object({
    query: z.string().min(1).max(300),
  })
  .strict();
export type AssistantAskInput = z.infer<typeof AssistantAskInputSchema>;

/**
 * Usage status query response
 */
export const AssistantUsageSchema = z
  .object({
    used: z.number().int().min(0),
    limit: z.number().int().positive(),
    remaining: z.number().int().min(0),
    resetsOn: z.string(), // YYYY-MM-DD
    plan: z.enum(["free", "premium"]),
    status: z.enum(["active", "grace", "capped", "disabled"]),
  })
  .strict();
export type AssistantUsage = z.infer<typeof AssistantUsageSchema>;
