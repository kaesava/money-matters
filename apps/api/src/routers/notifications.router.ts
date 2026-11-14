import { tenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import {
  registerDeviceTokenHandler,
  removeDeviceTokenHandler,
  getNotificationChannelStatusHandler,
} from "@money-matters/capability-notifications";
import { sendNotificationEmail } from "@money-matters/core";
import { inngest } from "../inngest/client.js";
import { z } from 'zod';

export const notificationsRouter = {
  getNotificationChannelStatus: tenantProcedure.query(async ({ ctx }) => {
    const handler = getNotificationChannelStatusHandler(ctx.db);
    return await handler(ctx.tenantId!, ctx.userId!, ctx.email!);
  }),

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
      const status = await getNotificationChannelStatusHandler(ctx.db)(
        ctx.tenantId!,
        ctx.userId!,
        ctx.email!
      );
      const dispatchedChannels: string[] = [];
      let emailDispatched = false;
      let pushDispatched = false;

      if ((input.channel === 'email' || input.channel === 'all') && status.emailRecipient) {
        await sendNotificationEmail(
          status.emailRecipient,
          '🔔 Test Notification — Money Matters',
          'This is a test notification confirming your email delivery channel is operational and connected.'
        );
        dispatchedChannels.push('email');
        emailDispatched = true;
      }

      if ((input.channel === 'push' || input.channel === 'all') && status.mobilePushDeviceCount > 0) {
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
        pushDispatched = true;
      }

      return {
        success: true,
        message: 'Test notification dispatched.',
        dispatchedChannels,
        emailRecipient: status.emailRecipient,
        emailDispatched,
        mobilePushDeviceCount: status.mobilePushDeviceCount,
        pushDispatched,
      };
    }),
};


