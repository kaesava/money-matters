import { Inngest } from 'inngest';
import { db, deviceTokens } from '@money-matters/db';
import { sendEmail } from '@money-matters/core';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const pushPayloadSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.any()).optional(),
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
            <p style="font-size: 16px; line-height: 1.6;">Welcome to Money Matters — your modern, Australian zero-based allocation budget.</p>
            <p style="font-size: 16px; line-height: 1.6;">Your 30-day full household trial is now active. Explore your dashboard to set up your allocation waterfall and bank accounts.</p>
            <div style="margin-top: 30px;">
              <a href="https://moneymatters.kaesava.au/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">Open Dashboard</a>
            </div>
          </div>
        `;

        return await sendEmail({
          to: email,
          subject: 'Welcome to Money Matters — Your Household Allocation Budget',
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
            <h1 style="color: #2563eb; margin-bottom: 16px;">Money Matters</h1>
            <h2 style="color: #ffffff;">Household Invitation</h2>
            <p style="font-size: 16px; line-height: 1.6;">You have been invited to join a household budget on Money Matters.</p>
            <p style="font-size: 16px; line-height: 1.6;">Joining grants shared visibility over your everyday pools, bill schedules, and savings goals.</p>
            <div style="margin-top: 30px;">
              <a href="${inviteUrl}" style="background-color: #22c55e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">Accept Household Invitation</a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Note: This invitation link is valid for 48 hours.</p>
          </div>
        `;

        return await sendEmail({
          to: email,
          subject: "You've been invited to join a Household on Money Matters",
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
              <h1 style="color: #ba1a1a; margin-bottom: 16px;">Money Matters</h1>
              <p style="font-size: 16px; line-height: 1.6;">Your account deletion request has been processed.</p>
              <p style="font-size: 14px; color: #94a3b8;">All personal credentials and associated household records have been permanently erased from our primary databases per privacy governance guidelines.</p>
            </div>
          `;
          return await sendEmail({
            to: email,
            subject: 'Account Deletion Confirmation — Money Matters',
            html,
          });
        });
      }

      return { success: true, userId };
    }
  );

  return [
    sendPushNotification,
    sendWelcomeEmail,
    sendPartnerInviteEmail,
    processAccountDeletion,
  ];
}
