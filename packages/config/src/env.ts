/**
 * Environment Configuration & Runtime Validation
 * 
 * Enforces strong type validation for system environment variables using Zod.
 * Validates critical production secrets strictly in production environments.
 */
import { z } from "zod";

export const baseEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url().optional(),
    PORT: z.coerce.number().int().positive().default(3001),
    // Async workflows (Inngest)
    INNGEST_SIGNING_KEY: z.string().min(1).default("mock-inngest-key"),
    INNGEST_EVENT_KEY: z.string().min(1).default("mock-inngest-event-key"),
    APP_MONEY_MATTERS_ID: z.string().uuid().default("01908bde-34bb-7b19-a178-574211bc93aa"),
    // Email and Storage capabilities
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().email().optional(),
    STORAGE_ENDPOINT: z.string().url().optional(),
    STORAGE_ACCESS_KEY_ID: z.string().min(1).optional(),
    STORAGE_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    STORAGE_REGION: z.string().default("auto"),
    STORAGE_BUCKET_NAME: z.string().min(1).optional(),
    EXPO_PUBLIC_NEON_AUTH_URL: z.string().url().optional(),
    NEXT_PUBLIC_NEON_AUTH_URL: z.string().url().optional(),
    NEON_AUTH_JWKS_URL: z.string().url().optional(),
    NEON_AUTH_BASE_URL: z.string().url().optional(),
    SENTRY_DSN: z.string().url().optional(),
    // Redis rate limiting
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    // Stripe payments (server secret & webhook validation)
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_PRICE_MONTHLY: z.string().min(1).optional(),
    STRIPE_PRICE_ANNUAL: z.string().min(1).optional(),
    STRIPE_PRICE_FOUNDING_ANNUAL: z.string().min(1).optional(),
    // PostHog product analytics
    POSTHOG_API_KEY: z.string().min(1).optional(),
    POSTHOG_PROJECT_TOKEN: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string().min(1).optional(),
    POSTHOG_HOST: z.string().url().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
    // Feature flags
    NEXT_PUBLIC_ENABLE_AUTH: z.string().transform((v) => v === "true").default("true"),
    // App Versioning metadata
    NEXT_PUBLIC_APP_VERSION: z.string().default("1.0.0-beta.1"),
    EXPO_PUBLIC_APP_VERSION: z.string().default("1.0.0-beta.1"),
    NEXT_PUBLIC_BUILD_NUMBER: z.string().default("1"),
    EXPO_PUBLIC_BUILD_NUMBER: z.string().default("1"),
    NEXT_PUBLIC_RELEASE_CHANNEL: z.enum(["development", "preview", "beta", "production"]).default("development"),
    EXPO_PUBLIC_RELEASE_CHANNEL: z.enum(["development", "preview", "beta", "production"]).default("development"),
    NEXT_PUBLIC_GIT_COMMIT: z.string().default("dev"),
    EXPO_PUBLIC_GIT_COMMIT: z.string().default("dev"),
  })
  .strict();

export const envSchema = baseEnvSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV === "production") {
    // In production, database connection is mandatory
    if (!data.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is strictly required in production environment",
      });
    }
    // In production, Neon auth verification must be configured
    if (!data.NEON_AUTH_JWKS_URL && !data.NEON_AUTH_BASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEON_AUTH_JWKS_URL"],
        message: "NEON_AUTH_JWKS_URL or NEON_AUTH_BASE_URL is strictly required in production",
      });
    }
    // In production, mock Inngest keys are forbidden
    if (data.INNGEST_SIGNING_KEY === "mock-inngest-key") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["INNGEST_SIGNING_KEY"],
        message: "Production requires a valid INNGEST_SIGNING_KEY (mock keys forbidden)",
      });
    }
    if (data.INNGEST_EVENT_KEY === "mock-inngest-event-key") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["INNGEST_EVENT_KEY"],
        message: "Production requires a valid INNGEST_EVENT_KEY (mock keys forbidden)",
      });
    }
  }
});

export type EnvConfig = z.infer<typeof envSchema>;

let envCache: EnvConfig | null = null;

/**
 * Extracts only the keys defined in schema shape from a source object
 * to satisfy strict schema validation on process.env.
 */
function extractSchemaKeys(source: Record<string, unknown>): Record<string, unknown> {
  const schemaKeys = Object.keys(baseEnvSchema.shape);
  const result: Record<string, unknown> = {};
  for (const key of schemaKeys) {
    if (source[key] !== undefined && source[key] !== "") {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Validates runtime environment variables against envSchema.
 * Throws a descriptive error if critical parameters are missing or invalid.
 *
 * @param customEnv - Optional custom environment dictionary for testing
 * @param resetCache - Force revalidation instead of returning cached result
 * @returns Validated environment object
 */
export function validateEnv(
  customEnv?: Record<string, unknown>,
  resetCache = false
): EnvConfig {
  if (envCache && !customEnv && !resetCache) {
    return envCache;
  }

  const raw = customEnv ?? (process.env as Record<string, unknown>);
  const filtered = extractSchemaKeys(raw);
  const result = envSchema.safeParse(filtered);

  if (!result.success) {
    console.error("❌ Environment configuration validation failed:", result.error.format());
    throw new Error("System Environment Failure: Missing or invalid configuration targets.");
  }

  if (!customEnv) {
    envCache = result.data;
  }
  return result.data;
}

/**
 * Clears cached environment configuration (primarily for unit test isolation).
 */
export function clearEnvCache(): void {
  envCache = null;
}

