/**
 * Monorepo Structured Logger
 *
 * Configured Pino logger with automatic PII redaction (email, password, auth tokens)
 * and uppercase log level formatting.
 */
import pino from "pino";
/**
 * Global structured logger instance.
 * Redacts sensitive authentication tokens and personal data per Monorepo Rule 7.
 */
export declare const logger: pino.Logger<never, boolean>;
//# sourceMappingURL=logger.d.ts.map