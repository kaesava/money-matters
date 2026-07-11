import pino from "pino";

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
