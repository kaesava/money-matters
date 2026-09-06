import { privateTenantProcedure } from '../trpc/trpc.js';
import { canAffordSimulationQuery } from '@money-matters/capability-simulation';
import { CanAffordQuery } from '@money-matters/types';

export const simulationRouter = {
  canAfford: privateTenantProcedure
    .input(CanAffordQuery)
    .query(async ({ input, ctx }) => {
      return await canAffordSimulationQuery(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),
};
