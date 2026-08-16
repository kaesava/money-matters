import { tenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { registerDeviceTokenHandler, removeDeviceTokenHandler } from "@money-matters/capability-notifications";
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
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      const handler = removeDeviceTokenHandler(ctx.db);
      return await handler(input, ctx.tenantId!, ctx.userId!);
    }),
};
