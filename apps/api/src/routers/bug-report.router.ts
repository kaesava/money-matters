import { tenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { createBugReportHandler } from '@money-matters/capability-bug-reports';
import { sendBugReportReceiptEmail, sendBugReportAdminAlertEmail } from '@money-matters/capability-notifications';
import { z } from 'zod';

export const bugReportRouter = {
  createBugReport: tenantProcedure
    .input(
      z
        .object({
          title: z.string().min(3, 'Title must be at least 3 characters').max(255),
          description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
          category: z.enum([
            'setup',
            'waterfall',
            'transactions_sync',
            'categories_bills',
            'ui_ux',
            'account_auth',
            'other',
            'budgeting',
            'transactions',
            'bank_accounts',
            'auth',
          ]),
          severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
          frustrationLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
          contactConsent: z.boolean().optional(),
          userEmail: z.string().email().optional(),
          appVersion: z.string().max(50).optional(),
          platform: z.enum(['web', 'ios', 'android']),
          pageUrl: z.string().max(512).optional(),
          deviceInfo: z.string().max(2000).optional(),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      const emailDispatcher = {
        sendReceiptEmail: sendBugReportReceiptEmail,
        sendAdminAlertEmail: sendBugReportAdminAlertEmail,
      };
      const handler = createBugReportHandler(ctx.db, emailDispatcher);
      const email = input.userEmail || (ctx as { user?: { email?: string } }).user?.email;
      return await handler(
        {
          ...input,
          userEmail: email,
        },
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!
      );
    }),
};
