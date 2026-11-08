import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import {
  getActiveAllocationStrategyQuery,
  applyAllocationPresetCommand,
  updateAllocationStrategyStepsCommand,
} from "@money-matters/capability-budgeting";
import {
  ApplyAllocationPresetCommand,
  UpdateAllocationStrategyStepsCommand,
  CANONICAL_ALLOCATION_PRESETS,
} from "@money-matters/types";

export const paydayStrategyProcedures = {
  getActiveAllocationStrategy: privateTenantProcedure.query(async ({ ctx }) => {
    return await getActiveAllocationStrategyQuery(
      ctx.tenantId!,
      ctx.appId!,
      ctx.userId!,
      ctx.db
    );
  }),

  listAllocationPresets: privateTenantProcedure.query(async () => {
    return CANONICAL_ALLOCATION_PRESETS;
  }),

  applyAllocationPreset: privateTenantProcedure
    .input(ApplyAllocationPresetCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await applyAllocationPresetCommand(
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        input.presetKey,
        ctx.db
      );
    }),

  updateAllocationStrategySteps: privateTenantProcedure
    .input(UpdateAllocationStrategyStepsCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await updateAllocationStrategyStepsCommand(
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        input.strategyId,
        input.steps,
        ctx.db
      );
    }),
};
