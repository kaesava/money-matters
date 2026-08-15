import { Inngest } from 'inngest';
import { db, deviceTokens } from '@money-matters/db';
import { sendEmail } from '@money-matters/core';
import { t } from '@money-matters/i18n';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const pushPayloadSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).optional(),
}).strict();

const partnerInvitePayloadSchema = z.object({
  email: z.string().email(),
  inviteToken: z.string().uuid(),
  tenantId: z.string(),
  senderUserId: z.string().optional(),
}).strict();

const welcomePayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
}).strict();

const accountDeletionPayloadSchema = z.object({
  userId: z.string(),
  tenantId: z.string().optional(),
  email: z.string().optional(),
}).strict();

export function createNotificationFunctions(inngest: Inngest) {
  const sendPushNotification = inngest.createFunction(
    { id: 'send-push-notification', retries: 3 },
    { event: 'notification/send-push' },
    async ({ event, step }) => {
      const payload = pushPayloadSchema.parse(event.data);
      const { userId, tenantId, title, body, data } = payload;

      const tokens = await step.run('fetch-device-tokens', async () => {
        return await db.query.deviceTokens.findMany({
          where: and(
            eq(deviceTokens.userId, userId),
            eq(deviceTokens.tenantId, tenantId)
          ),
        });
      });

      if (tokens.length === 0) {
        return { success: true, message: 'No device tokens registered for user', sentCount: 0 };
      }

      const messages = tokens.map((t) => ({
        to: t.token,
        sound: 'default' as const,
        title,
        body,
        data: data || {},
      }));

      const result = await step.run('dispatch-to-expo', async () => {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messages),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Expo Push API returned error status ${response.status}: ${errText}`);
        }

        return await response.json();
      });

      return { success: true, sentCount: messages.length, expoResult: result };
    }
  );

  const sendWelcomeEmail = inngest.createFunction(
    { id: 'send-welcome-email', retries: 3 },
    { event: 'auth/user.signup' },
    async ({ event, step }) => {
      const { email, displayName } = welcomePayloadSchema.parse(event.data);

      const result = await step.run('send-resend-welcome', async () => {
        const nameGreeting = displayName ? `Hi ${displayName},` : 'Hello,';
        const html = `
          <div style="font-family: sans-serif; background-color: #0b132b; color: #ffffff; padding: 40px; border-radius: 16px;">
            <h1 style="color: #2563eb; margin-bottom: 16px;">Money Matters</h1>
            <p style="font-size: 16px; line-height: 1.6;">${nameGreeting}</p>
            <p style="font-size: 16px; line-height: 1.6;">${t('notifications.inngest.trialActiveBody')}</p>
            <div style="margin-top: 30px;">
              <a href="https://moneymatters.kaesava.au/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">${t('notifications.inngest.openDashboardCta')}</a>
            </div>
          </div>
        `;

        return await sendEmail({
          to: email,
          subject: t('notifications.inngest.trialActiveSubject'),
          html,
        });
      });

      return { success: result.success };
    }
  );

  const sendPartnerInviteEmail = inngest.createFunction(
    { id: 'send-partner-invite-email', retries: 3 },
    { event: 'partner/invited' },
    async ({ event, step }) => {
      const { email, inviteToken } = partnerInvitePayloadSchema.parse(event.data);

      const result = await step.run('send-resend-invite', async () => {
        const inviteUrl = `https://moneymatters.kaesava.au/invite/${inviteToken}`;
        const html = `
          <div style="font-family: sans-serif; background-color: #0b132b; color: #ffffff; padding: 40px; border-radius: 16px;">
            <h2 style="color: #ffffff;">${t('notifications.inngest.inviteSubject')}</h2>
            <p style="font-size: 16px; line-height: 1.6;">${t('notifications.inngest.inviteBody')}</p>
            <div style="margin-top: 30px;">
              <a href="${inviteUrl}" style="background-color: #22c55e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">${t('notifications.inngest.acceptInviteCta')}</a>
            </div>
          </div>
        `;

        return await sendEmail({
          to: email,
          subject: t('notifications.inngest.inviteSubject'),
          html,
        });
      });

      return { success: result.success };
    }
  );

  const processAccountDeletion = inngest.createFunction(
    { id: 'process-account-deletion', retries: 3 },
    { event: 'user/account.delete-requested' },
    async ({ event, step }) => {
      const { userId, tenantId, email } = accountDeletionPayloadSchema.parse(event.data);

      await step.run('log-deletion-audit', async () => {
        console.log(`[Account Deletion Worker] Audit: User ${userId} requested account deletion for tenant ${tenantId || 'NONE'}`);
      });

      if (email) {
        await step.run('send-deletion-confirmation-email', async () => {
          const html = `
            <div style="font-family: sans-serif; background-color: #0b132b; color: #ffffff; padding: 40px; border-radius: 16px;">
              <h1 style="color: #ba1a1a; margin-bottom: 16px;">${t('notifications.inngest.deletionSubject')}</h1>
              <p style="font-size: 16px; line-height: 1.6;">${t('notifications.inngest.deletionBody')}</p>
            </div>
          `;
          return await sendEmail({
            to: email,
            subject: t('notifications.inngest.deletionSubject'),
            html,
          });
        });
      }


      return { success: true, userId };
    }
  );

  const sendWeeklyDigestEmail = inngest.createFunction(
    { id: 'send-weekly-digest-email', retries: 3 },
    { event: 'notification/send-digest-email' },
    async ({ event, step }) => {
      const { email } = event.data as { userId: string; email: string };

      const result = await step.run('send-resend-weekly-digest', async () => {
        const html = `
          <div style="font-family: sans-serif; background-color: #0b132b; color: #ffffff; padding: 40px; border-radius: 16px;">
            <h1 style="color: #2563eb; margin-bottom: 16px;">📊 Weekly Financial Summary</h1>
            <p style="font-size: 16px; line-height: 1.6;">Here is your weekly financial digest. Your spending and bill schedules for the upcoming week have been calculated.</p>
            <div style="margin-top: 30px;">
              <a href="https://moneymatters.kaesava.au/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">${t('notifications.inngest.openDashboardCta')}</a>
            </div>
          </div>
        `;

        return await sendEmail({
          to: email,
          subject: '📊 Your Weekly Financial Digest — Money Matters',
          html,
        });
      });

      return { success: result.success };
    }
  );

  return [
    sendPushNotification,
    sendWelcomeEmail,
    sendPartnerInviteEmail,
    processAccountDeletion,
    sendWeeklyDigestEmail,
  ];
}
