/**
 * Web Application Structured Logger
 * Safe for browser execution with automatic PII redaction.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const PII_KEYS = new Set(["email", "password", "token", "jwt", "authorization", "secret"]);

function redactPii(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactPii);
  }

  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PII_KEYS.has(key.toLowerCase())) {
      redacted[key] = "[REDACTED_PII]";
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactPii(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function formatLog(level: LogLevel, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const safeMeta = meta ? JSON.stringify(redactPii(meta)) : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${safeMeta}`.trim();
}

export const logger = {
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatLog("debug", message, meta));
    }
  },

  info: (message: string, meta?: any) => {
    console.info(formatLog("info", message, meta));
  },

  warn: (message: string, meta?: any) => {
    console.warn(formatLog("warn", message, meta));
  },

  error: (message: string, meta?: any) => {
    console.error(formatLog("error", message, meta));
  },
};
