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
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: ["email", "name", "password", "token", "jwt", "authorization"],
    censor: "[REDACTED_PII]"
  },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    }
  }
});

