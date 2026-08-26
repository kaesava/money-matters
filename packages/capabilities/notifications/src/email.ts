import { Buffer } from 'buffer';
import { logger } from '@money-matters/core';
import { t } from '@money-matters/i18n';

export interface BudgetAlertEmailDetails {
  categoryName: string;
  limitAmount: string;
  spentAmount: string;
  householdName?: string;
}

export async function sendEmailViaResend(options: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn('[Resend] RESEND_API_KEY is not defined. Simulating email send instead.');
    return { success: true, simulated: true };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Money Matters <info@moneymatters.kaesava.au>';
  
  const resendAttachments = options.attachments?.map(att => ({
    filename: att.filename,
    content: Buffer.from(att.content).toString('base64'),
  }));

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        attachments: resendAttachments,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Resend API returned status ${res.status}: ${text}`);
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err: unknown) {
    logger.error('[Resend] Error sending email via Resend:', err);
    throw err;
  }
}

export async function sendBudgetAlertEmail(to: string, details: BudgetAlertEmailDetails) {
  const title = t('notifications.email.budgetAlertSubject');
  const alertBodyText = t('notifications.email.budgetAlertBody', { category: details.categoryName });
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <h2 style="color: #ef4444; margin-top: 0;">${title}</h2>
      <div style="color: #334155; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${alertBodyText}</div>
      <div style="background-color: #fef2f2; padding: 16px; border-radius: 12px; margin: 24px 0; border: 1px solid #fee2e2;">
        <p style="margin: 4px 0; font-size: 13px; color: #991b1b;"><strong>${t('common.categoryOrAccount')}:</strong> <span style="color: #334155;">${details.categoryName}</span></p>
        <p style="margin: 4px 0; font-size: 13px; color: #991b1b;"><strong>Limit:</strong> <span style="color: #334155;">$${details.limitAmount}</span></p>
        <p style="margin: 4px 0; font-size: 13px; color: #991b1b;"><strong>Spent:</strong> <span style="color: #ef4444; font-weight: bold;">$${details.spentAmount}</span></p>
      </div>
    </div>
  `;

  return sendEmailViaResend({
    to,
    subject: `[Alert] Budget Exceeded for ${details.categoryName}`,
    html,
  });
}

export interface BugReportEmailDetails {
  ticketId: string;
  title: string;
  description: string;
  categoryLabel: string;
  frustrationLabel: string;
  platform: string;
  appVersion: string;
  deviceInfo?: string;
  tenantId?: string;
  userId?: string;
}

export async function sendBugReportReceiptEmail(to: string, details: BugReportEmailDetails) {
  const shortRef = details.ticketId.slice(0, 8);
  const subject = `[Ref: BUG-${shortRef}] Money Matters Bug Report Received`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <h2 style="color: #1B2B4B; margin-top: 0; font-size: 20px;">🐛 Bug Report Received</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Thank you for submitting feedback to Money Matters! We have logged your bug report under reference <strong>#BUG-${shortRef}</strong>.
      </p>
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
        <p style="margin: 6px 0; font-size: 13px; color: #1e293b;"><strong>Title:</strong> ${details.title}</p>
        <p style="margin: 6px 0; font-size: 13px; color: #1e293b;"><strong>Workflow Category:</strong> ${details.categoryLabel}</p>
        <p style="margin: 6px 0; font-size: 13px; color: #1e293b;"><strong>Frustration Level:</strong> ${details.frustrationLabel}</p>
        <p style="margin: 6px 0; font-size: 13px; color: #1e293b;"><strong>Details:</strong></p>
        <div style="font-size: 13px; color: #334155; white-space: pre-wrap; background-color: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">${details.description}</div>
      </div>
      <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 24px; border-t: 1px solid #f1f5f9; padding-top: 16px;">
        If you have additional screenshots or information, you can reply directly to this email retaining the <strong>[Ref: BUG-${shortRef}]</strong> subject line.
      </p>
    </div>
  `;

  return sendEmailViaResend({
    to,
    subject,
    html,
  });
}

export async function sendBugReportAdminAlertEmail(details: BugReportEmailDetails) {
  const adminEmail = process.env.BUG_REPORT_ADMIN_EMAIL || 'support@moneymatters.kaesava.au';
  const shortRef = details.ticketId.slice(0, 8);
  const subject = `[NEW BUG] [Ref: BUG-${shortRef}] ${details.title}`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 16px; background-color: #ffffff;">
      <h2 style="color: #ba1a1a; margin-top: 0; font-size: 18px;">🚨 New In-App Bug Report Submitted</h2>
      <table style="width: 100%; font-size: 13px; color: #1e293b; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; font-weight: bold; width: 140px;">Ticket Ref:</td><td>#BUG-${shortRef} (${details.ticketId})</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Title:</td><td>${details.title}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Category:</td><td>${details.categoryLabel}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Frustration Level:</td><td>${details.frustrationLabel}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Platform / Version:</td><td>${details.platform} (v${details.appVersion})</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Tenant ID:</td><td>${details.tenantId ?? 'N/A'}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">User ID:</td><td>${details.userId ?? 'N/A'}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Device Telemetry:</td><td>${details.deviceInfo ?? 'N/A'}</td></tr>
      </table>
      <div style="margin-top: 16px; padding: 14px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <strong style="font-size: 12px; color: #475569;">Report Description:</strong>
        <div style="font-size: 13px; color: #0f172a; white-space: pre-wrap; margin-top: 6px;">${details.description}</div>
      </div>
    </div>
  `;

  return sendEmailViaResend({
    to: adminEmail,
    subject,
    html,
  });
}
