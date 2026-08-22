import { tenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { createBugReportHandler } from '@money-matters/capability-bug-reports';
import { z } from 'zod';

export const bugReportRouter = {
  createBugReport: tenantProcedure
    .input(
      z
        .object({
          title: z.string().min(3, 'Title must be at least 3 characters').max(255),
          description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
          category: z.enum([
            'budgeting',
            'transactions',
            'bank_accounts',
            'ui_ux',
            'auth',
            'other',
          ]),
          severity: z.enum(['low', 'medium', 'high', 'critical']),
          appVersion: z.string().max(50).optional(),
          platform: z.enum(['web', 'ios', 'android']),
          pageUrl: z.string().max(512).optional(),
          deviceInfo: z.string().max(2000).optional(),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      const handler = createBugReportHandler(ctx.db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),
};
