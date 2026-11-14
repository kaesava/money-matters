import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import {
  overrideEventCommand,
  bulkDeleteEventsCommand,
  deleteUpcomingEventCommand,
  saveBulkAllocationsCommand,
  saveAutoAllocationCommand,
  getHorizonProjectionDataQuery,
} from "@money-matters/capability-budgeting";
import {
  OverrideEventCommand,
  DeleteUpcomingEventCommand,
  BulkDeleteEventsCommand,
} from "@money-matters/types";
import { z } from 'zod';

export const paydayHorizonProcedures = {
  overrideEvent: privateTenantProcedure
    .input(OverrideEventCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await overrideEventCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  deleteUpcomingEvent: privateTenantProcedure
    .input(DeleteUpcomingEventCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await deleteUpcomingEventCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  bulkDeleteEvents: privateTenantProcedure
    .input(BulkDeleteEventsCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await bulkDeleteEventsCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  saveBulkAllocations: privateTenantProcedure
    .input(
      z.object({
        incomeEventId: z.string().uuid(),
        totalIncomeAmount: z.string(),
        lines: z.array(z.object({
          envelopeId: z.string().uuid().optional(),
          poolId: z.string().uuid().optional(),
          proposedAmount: z.string(),
          reasoning: z.string().optional(),
        }).strict()),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await saveBulkAllocationsCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  saveAutoAllocation: privateTenantProcedure
    .input(
      z.object({
        incomeEventId: z.string().uuid(),
        totalIncomeAmount: z.string(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await saveAutoAllocationCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  getHorizonProjectionData: privateTenantProcedure
    .input(z.object({ monthsAhead: z.number().optional().default(12) }).strict())
    .query(async ({ input, ctx }) => {
      return await getHorizonProjectionDataQuery(ctx.tenantId!, ctx.appId!, ctx.userId!, input.monthsAhead, ctx.db);
    }),
};
