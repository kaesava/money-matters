import { z } from "zod";
import { checkRateLimit, sendEmail, logger } from "@money-matters/core";

export const SubmitFeedbackInputSchema = z
  .object({
    category: z.string().min(1).max(50),
    severity: z.string().min(1).max(50),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(4000),
    email: z.string().email().optional().or(z.literal("")),
    appVersion: z.string().max(100).optional(),
    route: z.string().max(200).optional(),
    userAgent: z.string().max(500).optional(),
    screen: z.string().max(50).optional(),
  })
  .strict();

export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackInputSchema>;

export interface SubmitFeedbackContext {
  userId?: string | null;
  tenantId?: string | null;
  userEmail?: string | null;
  env?: {
    UPSTASH_REDIS_REST_URL?: string;
    UPSTASH_REDIS_REST_TOKEN?: string;
  };
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDiagnostics(input: SubmitFeedbackInput, ctx: SubmitFeedbackContext): string {
  return [
    `Category: ${input.category}`,
    `Severity: ${input.severity}`,
    `User ID: ${ctx.userId || "N/A"}`,
    `Tenant ID: ${ctx.tenantId || "N/A"}`,
    `Email: ${input.email || ctx.userEmail || "N/A"}`,
    `App Version: ${input.appVersion || "N/A"}`,
    `Route: ${input.route || "N/A"}`,
    `User Agent: ${input.userAgent || "N/A"}`,
    `Screen: ${input.screen || "N/A"}`,
  ].join("\n");
}

function buildHtmlEmail(
  title: string,
  diagnostics: string,
  description: string
): string {
  const safeTitle = escapeHtml(title);
  const safeDiagnostics = escapeHtml(diagnostics).replace(/\n/g, "<br />");
  const safeDescription = escapeHtml(description).replace(/\n/g, "<br />");

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F7F8FA; padding: 24px; color: #1B2B4B;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background-color: #2563eb; padding: 16px 20px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 600;">Feedback: ${safeTitle}</h2>
        </div>
        <div style="padding: 20px;">
          <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #64748b;">Diagnostic Details</h3>
          <div style="background-color: #F7F8FA; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; line-height: 1.6; border: 1px solid #e2e8f0;">
            ${safeDiagnostics}
          </div>
          <h3 style="margin-top: 20px; font-size: 14px; text-transform: uppercase; color: #64748b;">Description</h3>
          <div style="line-height: 1.6; font-size: 14px; white-space: pre-wrap;">
            ${safeDescription}
          </div>
        </div>
        <div style="padding: 12px 20px; background-color: #F7F8FA; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
          Money Matters Feedback Dispatcher • Serene Finance Platform
        </div>
      </div>
    </div>
  `;
}

export async function submitFeedbackCommand(
  rawInput: SubmitFeedbackInput,
  ctx: SubmitFeedbackContext
): Promise<{ success: boolean; messageId?: string }> {
  const input = SubmitFeedbackInputSchema.parse(rawInput);
  const rateLimitKey = `feedback:${ctx.userId || ctx.tenantId || "anonymous"}`;
  const rateLimit = await checkRateLimit(rateLimitKey, 5, 3600, ctx.env);

  if (!rateLimit.allowed) {
    logger.warn("[BugReports] Feedback rate limit exceeded", { key: rateLimitKey });
    throw new Error("Rate limit exceeded. You can submit up to 5 feedback reports per hour.");
  }

  const diagnostics = formatDiagnostics(input, ctx);
  const subject = `[Feedback] [${input.severity}] ${input.title}`;
  const plainText = `${diagnostics}\n\nDescription:\n${input.description}`;
  const html = buildHtmlEmail(input.title, diagnostics, input.description);

  const result = await sendEmail({
    to: "info@moneymatters.kaesava.au",
    subject,
    text: plainText,
    html,
  });

  const senderEmail = input.email || ctx.userEmail;
  if (senderEmail) {
    const confirmationSubject = `Feedback Received: ${input.title}`;
    const confirmationHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F7F8FA; padding: 24px; color: #1B2B4B;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 16px 20px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 600;">We received your feedback</h2>
          </div>
          <div style="padding: 20px;">
            <p style="margin-top: 0; font-size: 14px; line-height: 1.6;">Thank you for helping us improve Money Matters. Our team has received your report:</p>
            <div style="background-color: #F7F8FA; padding: 12px; border-radius: 6px; font-size: 13px; line-height: 1.6; border: 1px solid #e2e8f0; margin-bottom: 16px;">
              <strong>${escapeHtml(input.title)}</strong><br />
              <span style="color: #64748b;">${escapeHtml(input.description)}</span>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.6;">If further information is needed, we will follow up with you directly.</p>
          </div>
          <div style="padding: 12px 20px; background-color: #F7F8FA; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
            Money Matters • Serene Finance Platform
          </div>
        </div>
      </div>
    `;

    await sendEmail({
      to: senderEmail,
      subject: confirmationSubject,
      text: `We received your feedback: ${input.title}\n\n${input.description}\n\nThank you for helping us improve Money Matters.`,
      html: confirmationHtml,
    }).catch((err) => logger.warn("[BugReports] Failed to send sender confirmation receipt:", { err }));
  }

  return { success: result.success, messageId: result.id };
}
