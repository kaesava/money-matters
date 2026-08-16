/**
 * Universal Monorepo Structured Logger
 * 
 * Safe for Node.js (API/Workers), Web (Next.js), and React Native (Expo).
 * Automatically redacts PII fields (emails, passwords, tokens) per Monorepo Rule 7.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const PII_KEYS = new Set([
  "email",
  "password",
  "token",
  "jwt",
  "authorization",
  "secret",
  "inviteemail",
  "invite_email",
  "displayname",
  "display_name",
  "avatarurl",
  "avatar_url",
  "note",
  "expopushtoken",
]);

/**
 * Recursively redacts sensitive PII fields from log metadata.
 * Safely handles primitives, null, arrays, Error objects, and nested objects without `any`.
 */
export function redactPii(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactPii(item));
  }

  if (obj instanceof Error) {
    const errorRecord: Record<string, unknown> = {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
    };
    for (const [key, value] of Object.entries(obj)) {
      if (PII_KEYS.has(key.toLowerCase())) {
        errorRecord[key] = "[REDACTED_PII]";
      } else {
        errorRecord[key] = redactPii(value);
      }
    }
    return errorRecord;
  }

  const record = obj as Record<string, unknown>;
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
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

/**
 * Serializes and formats log messages with ISO timestamp and redacted metadata.
 */
export function formatLog(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  let safeMeta = "";
  if (meta !== undefined) {
    try {
      safeMeta = JSON.stringify(redactPii(meta));
    } catch {
      safeMeta = "[Unserializable metadata]";
    }
  }
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${safeMeta}`.trim();
}

export const logger = {
  debug: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatLog("debug", message, meta));
    }
  },

  info: (message: string, meta?: unknown) => {
    console.info(formatLog("info", message, meta));
  },

  warn: (message: string, meta?: unknown) => {
    console.warn(formatLog("warn", message, meta));
  },

  error: (message: string, meta?: unknown) => {
    console.error(formatLog("error", message, meta));
  },
};

/**
 * Structured audit logging helper for security-critical events (Rule 19).
 */
export function logAuditEvent(
  action: string,
  tenantId: string,
  userId: string,
  meta?: Record<string, unknown>
): void {
  logger.info(`[AUDIT_EVENT] ${action}`, {
    action,
    tenantId,
    userId,
    ...meta,
  });
}

