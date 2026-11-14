import { logger } from "./logger.js";

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function redactEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "[REDACTED_EMAIL]";
  const [local, domain] = parts;
  const maskedLocal = local ? (local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : `${local[0]}***`) : "***";
  return `${maskedLocal}@${domain}`;
}

async function executeResendFetch(
  apiKey: string,
  fromAddress: string,
  payload: SendEmailPayload
): Promise<Response> {
  return await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      headers: {
        "List-Unsubscribe": "<https://moneymatters.kaesava.au/dashboard/settings/notifications>",
      },
    }),
    signal: AbortSignal.timeout(5000),
  });
}

async function sendWithRetry(
  apiKey: string,
  fromAddress: string,
  payload: SendEmailPayload
): Promise<{ success: boolean; id?: string }> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await executeResendFetch(apiKey, fromAddress, payload);

      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        logger.info("[Email Service] Transactional email dispatched via Resend:", {
          recipient: redactEmail(payload.to),
          subject: payload.subject,
          id: data.id,
        });
        return { success: true, id: data.id };
      }

      const errText = await res.text();
      logger.warn("[Email Service] Resend API attempt failed:", {
        attempt,
        status: res.status,
        error: errText,
      });

      // Do not retry non-429 4xx client errors (e.g. invalid email / auth error)
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return { success: false };
      }
    } catch (err) {
      lastError = err;
      logger.warn("[Email Service] Resend dispatch attempt error:", {
        attempt,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 200));
    }
  }

  logger.error("[Email Service] All Resend email dispatch attempts failed:", {
    recipient: redactEmail(payload.to),
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });
  return { success: false };
}

/**
 * Universal Resend transactional email abstraction for monorepo.
 * Automatically redacts PII in logger meta and enforces fail-closed in production.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; id?: string }> {
  const apiKey = process.env["RESEND_API_KEY"];
  const fromAddress = payload.from || process.env["RESEND_FROM_EMAIL"] || "Money Matters <info@moneymatters.kaesava.au>";
  const isProd = process.env["ENVIRONMENT"] === "production" || process.env["NODE_ENV"] === "production";

  if (!apiKey) {
    if (isProd) {
      logger.error("[Email Service] Fatal: RESEND_API_KEY is not configured in production");
      throw new Error("RESEND_API_KEY is not configured in production.");
    }
    logger.info("[Email Service] RESEND_API_KEY not configured. Simulated email dispatch:", {
      recipient: redactEmail(payload.to),
      subject: payload.subject,
    });
    return { success: true, id: "simulated-dev-email-id" };
  }

  return await sendWithRetry(apiKey, fromAddress, payload);
}

/**
 * High-level helper for notification emails with Australian Spam Act compliant footer and escaped HTML.
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  bodyText: string
): Promise<{ success: boolean; id?: string }> {
  const footerHtml = `
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5;">
      Money Matters by Kaesava AU • Sydney, NSW, Australia • info@moneymatters.kaesava.au<br />
      <a href="https://moneymatters.kaesava.au/dashboard/settings/notifications" style="color: #2563eb; text-decoration: underline;">Manage Notification Preferences & Unsubscribe</a>
    </div>
  `;
  const safeBody = escapeHtml(bodyText).replace(/\n/g, "<br />");
  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; line-height: 1.6; color: #1B2B4B;">${safeBody}${footerHtml}</div>`;
  return sendEmail({ to, subject, html, text: bodyText });
}
