import { tenantProcedure } from '../trpc/trpc.js';
import { allocationPlans, allocationPlanLines, categories } from "@money-matters/db";
import { and, eq, sql, desc } from "drizzle-orm";
import { posthog } from '../lib/posthog.js';
import {
  runAllocationCommand,
  confirmAllocationCommand,
  previewAllocationQuery,
  previewPaydayQuery,
  overrideEventCommand,
  bulkDeleteEventsCommand,
  deleteUpcomingEventCommand,
  ConfirmAllocationInput,
} from "@money-matters/capability-budgeting";
import {
  OverrideEventCommand,
  DeleteUpcomingEventCommand,
  BulkDeleteEventsCommand,
  ConfirmPaydayCommand,
} from "@money-matters/types";
import { z } from 'zod';

export const paydayRouter = {
  previewPayday: tenantProcedure
    .input(z.object({ incomeEventId: z.string().uuid() }).strict())
    .query(async ({ input, ctx }) => {
      return await previewPaydayQuery(input.incomeEventId, ctx.tenantId!, ctx.appId!, ctx.db);
    }),

  confirmPayday: tenantProcedure
    .input(ConfirmPaydayCommand)
    .mutation(async ({ input, ctx }) => {
      const result = await runAllocationCommand(
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        input.incomeEventId,
        parseFloat(input.actualAmount),
        ctx.db,
        input.lines,
        input.markAsReceivedToday
      );
      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'payday_confirmed',
          properties: {
            tenant_id: ctx.tenantId,
            income_event_id: input.incomeEventId,
            actual_amount: input.actualAmount,
            allocation_line_count: input.lines?.length ?? 0,
          },
        });
        await posthog.flush();
      }
      return result;
    }),

  overrideEvent: tenantProcedure
    .input(OverrideEventCommand)
    .mutation(async ({ input, ctx }) => {
      return await overrideEventCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  deleteUpcomingEvent: tenantProcedure
    .input(DeleteUpcomingEventCommand)
    .mutation(async ({ input, ctx }) => {
      return await deleteUpcomingEventCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  bulkDeleteEvents: tenantProcedure
    .input(BulkDeleteEventsCommand)
    .mutation(async ({ input, ctx }) => {
      return await bulkDeleteEventsCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  listAllocationPlan: tenantProcedure
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
          categoryId: allocationPlanLines.categoryId,
          proposedAmount: allocationPlanLines.proposedAmount,
          confirmedAmount: allocationPlanLines.confirmedAmount,
          reasoning: allocationPlanLines.reasoning,
          categoryName: categories.name,
        })
        .from(allocationPlanLines)
        .leftJoin(categories, eq(categories.id, allocationPlanLines.categoryId))
        .where(eq(allocationPlanLines.planId, plan.id));

      return {
        ...plan,
        lines: lines.map(l => ({ ...l, categoryName: l.categoryName ?? "Unknown" })),
      };
    }),

  runAllocation: tenantProcedure
    .input(
      z.object({
        incomeAmount: z.number().positive(),
        incomeEventId: z.string().uuid(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      return await runAllocationCommand(
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        input.incomeEventId,
        input.incomeAmount,
        ctx.db
      );
    }),

  previewAllocation: tenantProcedure
    .input(
      z.object({
        incomeEventId: z.string().uuid(),
        incomeAmount: z.number().positive(),
      }).strict()
    )
    .query(async ({ input, ctx }) => {
      return await previewAllocationQuery(
        ctx.tenantId!,
        ctx.appId!,
        input.incomeEventId,
        input.incomeAmount,
        ctx.db
      );
    }),

  confirmAllocation: tenantProcedure
    .input(ConfirmAllocationInput)
    .mutation(async ({ input, ctx }) => {
      return await confirmAllocationCommand(
        input,
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        ctx.db
      );
    }),
};
