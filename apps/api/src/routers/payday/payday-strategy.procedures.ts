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
  DEFAULT_APP_FEATURE_FLAGS,
} from "@money-matters/types";
import { allocationStrategies, apps } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const paydayStrategyProcedures = {
  getActiveAllocationStrategy: privateTenantProcedure
    .input(z.object({ isPrivate: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await getActiveAllocationStrategyQuery(
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        ctx.db,
        input?.isPrivate ?? false
      );
    }),

  listAllocationPresets: privateTenantProcedure.query(async () => {
    return CANONICAL_ALLOCATION_PRESETS;
  }),

  applyAllocationPreset: privateTenantProcedure
    .input(ApplyAllocationPresetCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const isPrivate = input.isPrivate ?? false;
      if (!isPrivate && ctx.session?.role !== 'OWNER') {
        throw new Error("Only household owners can change household allocation rules.");
      }
      return await applyAllocationPresetCommand(
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        input.presetKey,
        ctx.db,
        isPrivate
      );
    }),

  updateAllocationStrategySteps: privateTenantProcedure
    .input(UpdateAllocationStrategyStepsCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);

      const [appRecord] = await ctx.db
        .select({ featureFlags: apps.featureFlags })
        .from(apps)
        .where(eq(apps.id, ctx.appId!))
        .limit(1);

      const flags = {
        ...DEFAULT_APP_FEATURE_FLAGS,
        ...(appRecord?.featureFlags ?? {}),
      };
      if (!flags.customAllocationRules) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Custom allocation rules are disabled for this application.",
        });
      }

      const [strategy] = await ctx.db
        .select({ isPrivate: allocationStrategies.isPrivate, userId: allocationStrategies.userId })
        .from(allocationStrategies)
        .where(
          and(
            eq(allocationStrategies.id, input.strategyId),
            eq(allocationStrategies.tenantId, ctx.tenantId!),
            sql`${allocationStrategies.archivedAt} IS NULL`
          )
        )
        .limit(1);

      if (!strategy) {
        throw new Error("Allocation strategy not found.");
      }

      if (!strategy.isPrivate && ctx.session?.role !== 'OWNER') {
        throw new Error("Only household owners can change household allocation rules.");
      }
      if (strategy.isPrivate && strategy.userId !== ctx.userId) {
        throw new Error("You can only modify your own personal allocation rules.");
      }

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
