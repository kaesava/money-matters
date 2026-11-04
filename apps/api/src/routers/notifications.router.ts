import { tenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { registerDeviceTokenHandler, removeDeviceTokenHandler } from "@money-matters/capability-notifications";
import { sendNotificationEmail } from "@money-matters/core";
import { inngest } from "../inngest/client.js";
import { z } from 'zod';

export const notificationsRouter = {
  registerToken: tenantProcedure
    .input(
      z.object({
        platform: z.enum(['ios', 'android', 'web']),
        token: z.string().min(1, 'Push token is required'),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      const handler = registerDeviceTokenHandler(ctx.db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  removeToken: tenantProcedure
    .input(
      z.object({
        platform: z.enum(['ios', 'android', 'web']),
        token: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      const handler = removeDeviceTokenHandler(ctx.db);
      return await handler(input, ctx.tenantId!, ctx.userId!);
    }),

  sendTestNotification: tenantProcedure
    .input(
      z.object({
        channel: z.enum(['email', 'push', 'all']),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      const dispatchedChannels: string[] = [];

      if ((input.channel === 'email' || input.channel === 'all') && ctx.email) {
        await sendNotificationEmail(
          ctx.email,
          '🔔 Test Notification — Money Matters',
          'This is a test notification confirming your email delivery channel is operational and connected.'
        );
        dispatchedChannels.push('email');
      }

      if (input.channel === 'push' || input.channel === 'all') {
        await inngest.send({
          name: 'notification/send-push',
          data: {
            userId: ctx.userId!,
            tenantId: ctx.tenantId!,
            title: '🔔 Test Notification',
            body: 'Your notification pipeline is connected and working!',
            data: { route: '/(app)/home' },
          },
        }).catch(() => {});
        dispatchedChannels.push('push');
      }

      return { success: true, dispatchedChannels };
    }),

  submitFeedback: tenantProcedure
    .input(
      z.object({
        category: z.string().min(1),
        severity: z.string().min(1),
        email: z.string().email().optional().or(z.literal('')),
        title: z.string().min(1),
        description: z.string().min(1),
        appVersion: z.string().optional(),
        route: z.string().optional(),
        userAgent: z.string().optional(),
        screen: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      const subject = `[Feedback] ${input.title.trim()}`;
      const body = [
        `Category: ${input.category}`,
        `Severity: ${input.severity}`,
        `User ID: ${ctx.userId || 'N/A'}`,
        `Tenant ID: ${ctx.tenantId || 'N/A'}`,
        `Email: ${input.email || ctx.email || 'N/A'}`,
        `App Version: ${input.appVersion || 'N/A'}`,
        `Route: ${input.route || 'N/A'}`,
        `User Agent: ${input.userAgent || 'N/A'}`,
        `Screen: ${input.screen || 'N/A'}`,
        '',
        'Description:',
        input.description.trim(),
      ].join('\n');

      await sendNotificationEmail(
        'info@moneymatters.kaesava.au',
        subject,
        body
      );

      return { success: true };
    }),
};


