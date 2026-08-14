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

  const from = process.env.RESEND_FROM_EMAIL || 'MoneyMatters <onboarding@resend.dev>';
  
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
