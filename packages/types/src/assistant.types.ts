import { z } from "zod";

/**
 * Canonical intents supported by Penny AI Assistant
 */
export const AssistantIntentEnum = z.enum([
  "GREETING_HELP",
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
  "EDIT_ENTITY",
  "NAVIGATE_HELP",
  "OUT_OF_SCOPE",
  "UNKNOWN",
]);
export type AssistantIntent = z.infer<typeof AssistantIntentEnum>;

export const AssistantIntentParamsSchema = z
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
  .strict();

/**
 * Classifier output schema extracted from deterministic rule-engine or normalized LLM output
 */
export const AssistantClassifiedIntentSchema = z
  .object({
    intent: AssistantIntentEnum,
    confidence: z.number().min(0).max(1),
    params: AssistantIntentParamsSchema,
  })
  .strict();
export type AssistantClassifiedIntent = z.infer<typeof AssistantClassifiedIntentSchema>;

const optionalTrimmedString = z.preprocess(
  (v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined),
  z.string().optional()
);

const optionalPositiveNumber = z.preprocess(
  (v) => {
    const n = typeof v === "string" ? Number(v) : v;
    return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined;
  },
  z.number().positive().optional()
);

const optionalPositiveInt = z.preprocess(
  (v) => {
    const n = typeof v === "string" ? Number(v) : v;
    return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : undefined;
  },
  z.number().int().positive().optional()
);

/**
 * Tolerant parser for raw LLM JSON responses (handles null fields / extra keys cleanly).
 */
export const LlmRawParamsSchema = z
  .object({
    entityName: optionalTrimmedString,
    amount: optionalPositiveNumber,
    date: optionalTrimmedString,
    daysAhead: optionalPositiveInt,
    targetScreen: optionalTrimmedString,
    sourceAccount: optionalTrimmedString,
    destinationAccount: optionalTrimmedString,
    categoryName: optionalTrimmedString,
  })
  .strip();

export const AssistantLlmResponseSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("intent"),
      intent: AssistantIntentEnum,
      confidence: z.number().min(0).max(1).default(0.9),
      params: LlmRawParamsSchema.default({}),
    })
    .strip(),
  z
    .object({
      mode: z.literal("answer"),
      text: z.string().trim().min(1).max(600),
    })
    .strip(),
  z
    .object({
      mode: z.literal("refuse"),
    })
    .strip(),
]);
export type AssistantLlmResponse = z.infer<typeof AssistantLlmResponseSchema>;

/**
 * Discriminator result returned to UI client
 */
export const AssistantAnswerResultSchema = z
  .object({
    type: z.literal("answer"),
    templateKey: z.string().optional(),
    templateValues: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    text: z.string().max(800).optional(),
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
      "edit-envelope",
      "edit-bill",
      "edit-income",
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
    reason: z.enum([
      "quota_exceeded",
      "read_only_grace",
      "subscription_required",
      "disabled",
      "rate_limited",
      "service_error",
      "unauthenticated",
    ]),
  })
  .strict();

export const AssistantResultSchema = z
  .discriminatedUnion("type", [
    AssistantAnswerResultSchema,
    AssistantPrefillResultSchema,
    AssistantClarifyResultSchema,
    AssistantUnavailableResultSchema,
  ])
  .superRefine((val, ctx) => {
    if (val.type === "answer" && !val.templateKey && !val.text) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either templateKey or text must be provided on an answer result.",
      });
    }
  });
export type AssistantResult = z.infer<typeof AssistantResultSchema>;

/**
 * Ask query request input
 */
export const AssistantAskInputSchema = z
  .object({
    query: z.string().trim().min(1).max(300),
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
