/**
 * Environment Configuration & Runtime Validation
 *
 * Enforces strong type validation for system environment variables using Zod.
 * Caches validated environment variables for high-performance access across microservices and API routes.
 */
import { z } from "zod";
declare const envSchema: z.ZodObject<{
    DATABASE_URL: z.ZodOptional<z.ZodString>;
    PORT: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    STACK_AUTH_SECRET: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    INNGEST_SIGNING_KEY: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    INNGEST_EVENT_KEY: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    APP_MONEY_MATTERS_ID: z.ZodDefault<z.ZodString>;
    RESEND_API_KEY: z.ZodOptional<z.ZodString>;
    STORAGE_ENDPOINT: z.ZodOptional<z.ZodString>;
    STORAGE_ACCESS_KEY_ID: z.ZodOptional<z.ZodString>;
    STORAGE_SECRET_ACCESS_KEY: z.ZodOptional<z.ZodString>;
    STORAGE_REGION: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    STORAGE_BUCKET_NAME: z.ZodOptional<z.ZodString>;
    EXPO_PUBLIC_NEON_AUTH_URL: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    STORAGE_REGION: string;
    PORT: number;
    STACK_AUTH_SECRET: string;
    INNGEST_SIGNING_KEY: string;
    INNGEST_EVENT_KEY: string;
    APP_MONEY_MATTERS_ID: string;
    DATABASE_URL?: string | undefined;
    RESEND_API_KEY?: string | undefined;
    STORAGE_ENDPOINT?: string | undefined;
    STORAGE_ACCESS_KEY_ID?: string | undefined;
    STORAGE_SECRET_ACCESS_KEY?: string | undefined;
    STORAGE_BUCKET_NAME?: string | undefined;
    EXPO_PUBLIC_NEON_AUTH_URL?: string | undefined;
}, {
    DATABASE_URL?: string | undefined;
    RESEND_API_KEY?: string | undefined;
    STORAGE_ENDPOINT?: string | undefined;
    STORAGE_ACCESS_KEY_ID?: string | undefined;
    STORAGE_SECRET_ACCESS_KEY?: string | undefined;
    STORAGE_REGION?: string | undefined;
    STORAGE_BUCKET_NAME?: string | undefined;
    PORT?: string | undefined;
    STACK_AUTH_SECRET?: string | undefined;
    INNGEST_SIGNING_KEY?: string | undefined;
    INNGEST_EVENT_KEY?: string | undefined;
    APP_MONEY_MATTERS_ID?: string | undefined;
    EXPO_PUBLIC_NEON_AUTH_URL?: string | undefined;
}>;
/**
 * Validates runtime environment variables against envSchema.
 * Throws a descriptive error if critical parameters (e.g. DATABASE_URL) are missing or invalid.
 *
 * @returns Validated environment object
 */
export declare function validateEnv(): z.infer<typeof envSchema>;
export {};
//# sourceMappingURL=env.d.ts.map