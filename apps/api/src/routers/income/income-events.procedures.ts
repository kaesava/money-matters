import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import {
  createIncomeEventCommand,
  listIncomeEventsQuery,
  createUpcomingIncomeCommand,
  updateUpcomingIncomeCommand,
  markIncomeReceivedCommand,
  deleteIncomeEventCommand,
} from "@money-matters/capability-budgeting";
import { posthog } from '../../lib/posthog.js';
import { CreateIncomeEventCommand } from "@money-matters/types";
import { z } from 'zod';

export const incomeEventsProcedures = {
  createIncomeEvent: privateTenantProcedure
    .input(CreateIncomeEventCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await createIncomeEventCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  listIncomeEvents: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await listIncomeEventsQuery(ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  createUpcomingIncome: privateTenantProcedure
    .input(
      z.object({
        name: z.string().min(1),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        expectedDate: z.string(),
        receivingAccountId: z.string().uuid().optional(),
        contributionMode: z.enum(["FULL", "PERCENTAGE", "FIXED_AMOUNT"]).optional(),
        contributionValue: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
        note: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await createUpcomingIncomeCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  updateUpcomingIncome: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        expectedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        expectedDate: z.string().optional(),
        contributionMode: z.enum(["FULL", "PERCENTAGE", "FIXED_AMOUNT"]).optional(),
        contributionValue: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await updateUpcomingIncomeCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  markIncomeReceived: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        actualAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        note: z.string().optional(),
        recordedAt: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const result = await markIncomeReceivedCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'income_marked_received',
          properties: { tenant_id: ctx.tenantId },
        });
        await posthog.flush();
      }
      return result;
    }),

  deleteIncomeEvent: privateTenantProcedure
    .input(z.object({ eventId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await deleteIncomeEventCommand(input.eventId, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),
};
