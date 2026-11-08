import { privateTenantProcedure } from '../trpc/trpc.js';
import { canAffordSimulationQuery } from '@money-matters/capability-simulation';
import { runCumulativeProjection } from '@money-matters/capability-budgeting';
import { CanAffordQuery, DEFAULT_APP_FEATURE_FLAGS } from '@money-matters/types';
import { apps } from '@money-matters/db';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const simulationRouter = {
  canAfford: privateTenantProcedure
    .input(CanAffordQuery)
    .query(async ({ input, ctx }) => {
      const [appRecord] = await ctx.db
        .select({ featureFlags: apps.featureFlags })
        .from(apps)
        .where(eq(apps.id, ctx.appId!))
        .limit(1);

      const flags = appRecord?.featureFlags || DEFAULT_APP_FEATURE_FLAGS;
      if (!flags.simulation) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Simulation feature is disabled for this application.',
        });
      }

      return await canAffordSimulationQuery(
        input,
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        ctx.db,
        {
          projectionEngine: runCumulativeProjection as unknown as import('@money-matters/types').ProjectionEngineFn,
        }
      );
    }),
};
