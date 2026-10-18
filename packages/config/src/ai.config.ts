import { z } from "zod";

/**
 * Model identifier constraint.
 * We use Meta LLaMA 3.1 8B Instruct Fast on Cloudflare Workers AI.
 */
export const DEFAULT_AI_MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fast";

/**
 * AI Assistant Environment Schema
 */
export const aiEnvSchema = z
  .object({
    CF_ACCOUNT_ID: z.string().min(1).default("b0a640370b2b7ba2b84abfd03a9fda56"),
    CF_AI_GATEWAY_ID: z.string().min(1).default("money-matters-ai-dev"),
    CF_AI_API_TOKEN: z.string().min(1).optional(),
    AI_MODEL_ID: z.string().min(1).default(DEFAULT_AI_MODEL_ID),
  })
  .strict();

export type AiEnvConfig = z.infer<typeof aiEnvSchema>;

/**
 * Per-tenant monthly and burst limits for AI usage.
 * Deterministic (pre-canned / rule-based) answers bypass the LLM and are always free.
 */
export interface AiTierLimits {
  monthlyLlmCalls: number;
  burstPerMinute: number;
  burstPerDay: number;
}

export const AI_TIER_LIMITS: Record<"free" | "premium", AiTierLimits> = {
  free: {
    monthlyLlmCalls: 150,
    burstPerMinute: 10,
    burstPerDay: 40,
  },
  premium: {
    monthlyLlmCalls: 500,
    burstPerMinute: 20,
    burstPerDay: 100,
  },
} as const;

/**
 * Resolves AI configuration from environment variables.
 */
export function resolveAiConfig(env: Record<string, unknown> = process.env): AiEnvConfig {
  return aiEnvSchema.parse({
    CF_ACCOUNT_ID: env["CF_ACCOUNT_ID"],
    CF_AI_GATEWAY_ID: env["CF_AI_GATEWAY_ID"],
    CF_AI_API_TOKEN: env["CF_AI_API_TOKEN"],
    AI_MODEL_ID: env["AI_MODEL_ID"] || DEFAULT_AI_MODEL_ID,
  });
}
