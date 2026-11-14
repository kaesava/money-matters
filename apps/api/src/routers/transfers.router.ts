import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { moveMoneyCommand } from "@money-matters/capability-budgeting";
import {
  listTransferEventsQuery,
  createTransferSourceCommand,
  deleteTransferEventCommand,
  updateTransferEventCommand,
  executeTransferEventCommand,
} from "@money-matters/capability-transactions";
import { z } from 'zod';

export const transfersRouter = {
  listTransferEvents: privateTenantProcedure
    .query(({ ctx }) => listTransferEventsQuery(ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db)),

  createTransferSource: privateTenantProcedure
    .input(
      z.object({
        name: z.string().optional(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        sourceEnvelopeId: z.string().uuid().optional(),
        sourcePoolId: z.string().uuid().optional(),
        destinationEnvelopeId: z.string().uuid().optional(),
        destinationPoolId: z.string().uuid().optional(),
        startDate: z.string().optional(),
      }).strict()
    )
    .mutation(({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return createTransferSourceCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  deleteTransferEvent: privateTenantProcedure
    .input(z.object({ eventId: z.string().uuid() }).strict())
    .mutation(({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return deleteTransferEventCommand(input.eventId, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  updateTransferEvent: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        name: z.string().min(1).optional(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        expectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }).strict()
    )
    .mutation(({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return updateTransferEventCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  executeTransferEvent: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        name: z.string().optional(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        sourceEnvelopeId: z.string().uuid().optional(),
        sourcePoolId: z.string().uuid().optional(),
        destinationEnvelopeId: z.string().uuid().optional(),
        destinationPoolId: z.string().uuid().optional(),
      }).strict()
    )
    .mutation(({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return executeTransferEventCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db, moveMoneyCommand);
    }),
};
