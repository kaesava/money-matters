import { logger } from "./logger.js";

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

/**
 * Universal Resend transactional email abstraction for monorepo.
 * Automatically redacts PII in logger meta and handles dev simulation gracefully.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; id?: string }> {
  const apiKey = process.env["RESEND_API_KEY"];
  const fromAddress = payload.from || process.env["RESEND_FROM_EMAIL"] || "Money Matters <info@moneymatters.kaesava.au>";

  if (!apiKey) {
    logger.info("[Email Service] RESEND_API_KEY not configured. Simulated email dispatch:", {
      to: payload.to,
      subject: payload.subject,
    });
    return { success: true, id: "simulated-dev-email-id" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
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
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error("[Email Service] Resend API response error:", { status: res.status, error: errText });
      return { success: false };
    }

    const data = (await res.json()) as { id?: string };
    logger.info("[Email Service] Transactional email dispatched via Resend:", { to: payload.to, subject: payload.subject, id: data.id });
    return { success: true, id: data.id };
  } catch (err) {
    logger.error("[Email Service] Network error sending email via Resend:", { err });
    return { success: false };
  }
}

/**
 * High-level helper for simple plain-text / HTML notification emails with Australian Spam Act compliant footer.
 */
export async function sendNotificationEmail(to: string, subject: string, bodyText: string): Promise<{ success: boolean; id?: string }> {
  const footerHtml = `
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5;">
      Money Matters by Kaesava AU • Sydney, NSW, Australia • info@moneymatters.kaesava.au<br />
      <a href="https://moneymatters.kaesava.au/dashboard/settings/notifications" style="color: #2563eb; text-decoration: underline;">Manage Notification Preferences & Unsubscribe</a>
    </div>
  `;
  const html = `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #1B2B4B;">${bodyText.replace(/\n/g, "<br />")}${footerHtml}</div>`;
  return sendEmail({ to, subject, html, text: bodyText });
}
