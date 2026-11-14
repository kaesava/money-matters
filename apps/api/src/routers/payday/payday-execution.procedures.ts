import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { incomeEvents, incomeSources, bankAccounts, apps } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { posthog } from '../../lib/posthog.js';
import {
  runAllocationCommand,
  previewPaydayQuery,
  resetAllocationPlanCommand,
  getIncomeSplitAnalyticsQuery,
  listAllocationPlanQuery,
  listAllAllocationPlansQuery,
} from "@money-matters/capability-budgeting";
import {
  ConfirmPaydayCommand,
  GetIncomeSplitAnalyticsQuerySchema,
  DEFAULT_APP_FEATURE_FLAGS,
} from "@money-matters/types";
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const paydayExecutionProcedures = {
  resetAllocationPlan: privateTenantProcedure
    .input(z.object({ incomeEventId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);

      const [targetEvent] = await ctx.db
        .select({ bankAccountIsPrivate: bankAccounts.isPrivate, bankAccountUserId: bankAccounts.userId })
        .from(incomeEvents)
        .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
        .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
        .where(and(eq(incomeEvents.id, input.incomeEventId), eq(incomeEvents.tenantId, ctx.tenantId!), eq(incomeEvents.appId, ctx.appId!), sql`${incomeEvents.archivedAt} IS NULL`));

      if (!targetEvent || (targetEvent.bankAccountIsPrivate && targetEvent.bankAccountUserId !== ctx.userId)) {
        throw new Error("Target income event not found.");
      }

      return await resetAllocationPlanCommand(input.incomeEventId, ctx.tenantId!, ctx.appId!, ctx.db);
    }),

  previewPayday: privateTenantProcedure
    .input(z.object({ incomeEventId: z.string().uuid(), overrideAmount: z.number().min(0).optional() }).strict())
    .query(({ input, ctx }) =>
      previewPaydayQuery(input.incomeEventId, ctx.tenantId!, ctx.appId!, ctx.db, ctx.userId!, input.overrideAmount)
    ),

  confirmPayday: privateTenantProcedure
    .input(ConfirmPaydayCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const customLines = input.lines?.map((l) => ({ bucketId: l.envelopeId, amount: l.amount, reasoning: l.reasoning }));
      const result = await runAllocationCommand(
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        input.incomeEventId,
        parseFloat(input.actualAmount),
        ctx.db,
        customLines,
        input.markAsReceivedToday,
        input.runwayDays
      );

      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'payday_confirmed',
          properties: { tenant_id: ctx.tenantId, actual_amount: parseFloat(input.actualAmount), line_count: customLines?.length ?? 0 },
        });
        await posthog.flush();
      }
      return result;
    }),

  listAllocationPlan: privateTenantProcedure
    .input(z.object({ incomeEventId: z.string().uuid() }).strict())
    .query(({ input, ctx }) =>
      listAllocationPlanQuery(input.incomeEventId, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db)
    ),

  listAllAllocationPlans: privateTenantProcedure
    .query(({ ctx }) => listAllAllocationPlansQuery(ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db)),

  getIncomeSplitAnalytics: privateTenantProcedure
    .input(GetIncomeSplitAnalyticsQuerySchema)
    .query(async ({ input, ctx }) => {
      const [appRecord] = await ctx.db.select({ featureFlags: apps.featureFlags }).from(apps).where(eq(apps.id, ctx.appId!)).limit(1);
      const flags = appRecord?.featureFlags || DEFAULT_APP_FEATURE_FLAGS;
      if (!flags.reports) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Reports feature is disabled for this application.' });
      }
      return await getIncomeSplitAnalyticsQuery(ctx.tenantId!, ctx.appId!, input, ctx.db);
    }),
};
