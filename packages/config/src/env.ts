import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().transform(val => Number(val)).default("3001"),
  // Placeholder keys required for Stack Auth / Inngest V1
  STACK_AUTH_SECRET: z.string().optional().default("mock-secret-for-v1"),
  INNGEST_SIGNING_KEY: z.string().optional().default("mock-inngest-key"),
  INNGEST_EVENT_KEY: z.string().optional().default("mock-inngest-event-key"),
  APP_MONEY_MATTERS_ID: z.string().uuid().default("01908bde-34bb-7b19-a178-574211bc93aa"),
}).strict();

let envCache: z.infer<typeof envSchema> | null = null;

export function validateEnv(): z.infer<typeof envSchema> {
  if (envCache) return envCache;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Environment configuration validation failed:", result.error.format());
    throw new Error("System Environment Failure: Missing or invalid configuration targets.");
  }

  envCache = result.data;
  return envCache;
}
