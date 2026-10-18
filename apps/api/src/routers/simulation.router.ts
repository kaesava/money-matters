import { privateTenantProcedure } from '../trpc/trpc.js';
import { canAffordSimulationQuery } from '@money-matters/capability-simulation';
import { runCumulativeProjection } from '@money-matters/capability-budgeting';
import { CanAffordQuery } from '@money-matters/types';

export const simulationRouter = {
  canAfford: privateTenantProcedure
    .input(CanAffordQuery)
    .query(async ({ input, ctx }) => {
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
