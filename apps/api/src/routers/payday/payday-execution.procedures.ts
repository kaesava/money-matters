import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { allocationPlans, allocationPlanLines, envelopes, incomeEvents, incomeSources, bankAccounts } from "@money-matters/db";
import { and, eq, sql, desc, inArray } from "drizzle-orm";
import { posthog } from '../../lib/posthog.js';
import {
  runAllocationCommand,
  previewPaydayQuery,
  resetAllocationPlanCommand,
  getIncomeSplitAnalyticsQuery,
} from "@money-matters/capability-budgeting";
import {
  ConfirmPaydayCommand,
  GetIncomeSplitAnalyticsQuerySchema,
} from "@money-matters/types";
import { z } from 'zod';

export const paydayExecutionProcedures = {
  resetAllocationPlan: privateTenantProcedure
    .input(z.object({ incomeEventId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await resetAllocationPlanCommand(
        input.incomeEventId,
        ctx.tenantId!,
        ctx.appId!,
        ctx.db
      );
    }),

  previewPayday: privateTenantProcedure
    .input(z.object({ incomeEventId: z.string().uuid() }).strict())
    .query(async ({ input, ctx }) => {
      return await previewPaydayQuery(input.incomeEventId, ctx.tenantId!, ctx.appId!, ctx.db);
    }),

  confirmPayday: privateTenantProcedure
    .input(ConfirmPaydayCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const customLines = input.lines?.map((l) => ({
        bucketId: l.envelopeId,
        amount: l.amount,
        reasoning: l.reasoning,
      }));

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
          properties: {
            tenant_id: ctx.tenantId,
            line_count: customLines?.length ?? 0,
          },
        });
        await posthog.flush();
      }

      return result;
    }),

  listAllocationPlan: privateTenantProcedure
    .input(z.object({ incomeEventId: z.string().uuid() }).strict())
    .query(async ({ input, ctx }) => {
      const [plan] = await ctx.db
        .select()
        .from(allocationPlans)
        .where(
          and(
            eq(allocationPlans.incomeEventId, input.incomeEventId),
            eq(allocationPlans.tenantId, ctx.tenantId!),
            eq(allocationPlans.appId, ctx.appId!),
            sql`${allocationPlans.archivedAt} IS NULL`
          )
        )
        .orderBy(desc(allocationPlans.createdAt))
        .limit(1);

      if (!plan) return null;

      const lines = await ctx.db
        .select({
          id: allocationPlanLines.id,
          envelopeId: allocationPlanLines.envelopeId,
          poolId: allocationPlanLines.envelopeId,
          proposedAmount: allocationPlanLines.proposedAmount,
          confirmedAmount: allocationPlanLines.confirmedAmount,
          reasoning: allocationPlanLines.reasoning,
          envelopeName: envelopes.name,
          poolName: envelopes.name,
        })
        .from(allocationPlanLines)
        .leftJoin(envelopes, eq(envelopes.id, allocationPlanLines.envelopeId))
        .where(eq(allocationPlanLines.planId, plan.id));

      return {
        ...plan,
        lines: lines.map(l => ({ ...l, envelopeName: l.envelopeName ?? "Unknown Envelope", poolName: l.poolName ?? "Unknown Envelope" })),
      };
    }),

  listAllAllocationPlans: privateTenantProcedure
    .query(async ({ ctx }) => {
      const plans = await ctx.db
        .select({
          id: allocationPlans.id,
          tenantId: allocationPlans.tenantId,
          appId: allocationPlans.appId,
          incomeEventId: allocationPlans.incomeEventId,
          totalIncomeAmount: allocationPlans.totalIncomeAmount,
          status: allocationPlans.status,
          createdAt: allocationPlans.createdAt,
          updatedAt: allocationPlans.updatedAt,
          incomeName: sql<string>`COALESCE(${incomeEvents.name}, ${incomeSources.name}, 'Income Deposit')`,
          receivingAccountName: bankAccounts.name,
          receivingAccountId: bankAccounts.id,
          expectedDate: sql<string>`COALESCE(${incomeEvents.expectedDate}::text, ${incomeEvents.actualDate}::text, TO_CHAR(${allocationPlans.createdAt}, 'YYYY-MM-DD'))`,
          actualDate: incomeEvents.actualDate,
          note: incomeEvents.note,
        })
        .from(allocationPlans)
        .leftJoin(incomeEvents, eq(incomeEvents.id, allocationPlans.incomeEventId))
        .leftJoin(incomeSources, eq(incomeSources.id, incomeEvents.incomeSourceId))
        .leftJoin(bankAccounts, eq(bankAccounts.id, incomeSources.receivingAccountId))
        .where(
          and(
            eq(allocationPlans.tenantId, ctx.tenantId!),
            eq(allocationPlans.appId, ctx.appId!),
            sql`${allocationPlans.archivedAt} IS NULL`
          )
        )
        .orderBy(desc(allocationPlans.createdAt))
        .limit(50);

      const planIds = plans.map(p => p.id);
      let lines: Array<{ planId: string; envelopeId: string; proposedAmount: string; confirmedAmount: string | null; reasoning: string | null; envelopeName: string | null }> = [];
      if (planIds.length > 0) {
        lines = await ctx.db
          .select({
            planId: allocationPlanLines.planId,
            envelopeId: allocationPlanLines.envelopeId,
            proposedAmount: allocationPlanLines.proposedAmount,
            confirmedAmount: allocationPlanLines.confirmedAmount,
            reasoning: allocationPlanLines.reasoning,
            envelopeName: envelopes.name,
          })
          .from(allocationPlanLines)
          .leftJoin(envelopes, eq(envelopes.id, allocationPlanLines.envelopeId))
          .where(inArray(allocationPlanLines.planId, planIds));
      }

      return plans.map((plan) => ({
        ...plan,
        lines: lines
          .filter((l) => l.planId === plan.id)
          .map((l) => ({
            ...l,
            poolId: l.envelopeId,
            poolName: l.envelopeName ?? "Unknown Envelope",
          })),
      }));
    }),

  getIncomeSplitAnalytics: privateTenantProcedure
    .input(GetIncomeSplitAnalyticsQuerySchema)
    .query(async ({ input, ctx }) => {
      return await getIncomeSplitAnalyticsQuery(
        ctx.tenantId!,
        ctx.appId!,
        input,
        ctx.db
      );
    }),
};
