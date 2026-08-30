import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import {
  createPoolCommand,
  updatePoolCommand,
  archivePoolCommand,
  listPoolsQuery,
  moveMoneyCommand,
} from "@money-matters/capability-budgeting";
import {
  CreatePoolCommand,
  UpdatePoolCommand,
  MoveMoneyCommand,
} from "@money-matters/types";
import { z } from 'zod';

export const poolsRouter = {
  createPool: privateTenantProcedure
    .input(CreatePoolCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await createPoolCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  updatePool: privateTenantProcedure
    .input(z.object({
      poolId: z.string().uuid(),
      data: UpdatePoolCommand
    }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await updatePoolCommand(input.poolId, input.data, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  archivePool: privateTenantProcedure
    .input(z.object({ poolId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const result = await archivePoolCommand(input.poolId, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
      return { success: true };
    }),

  listPools: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await listPoolsQuery(ctx.tenantId!, ctx.appId!, ctx.db, ctx.userId);
    }),

  moveMoney: privateTenantProcedure
    .input(MoveMoneyCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await moveMoneyCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),
};
