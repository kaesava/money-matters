import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Rule 5: Enforce strict tenantProcedure boundary isolation controls
export const tenantProcedure = t.procedure.use(async ({ ctx, next }) => {
  const tenantId = ctx.req.headers['x-tenant-id'];
  const appId = ctx.req.headers['x-app-id'];

  if (!tenantId || !appId || appId !== 'money') {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Multi-tenancy boundary violation: Missing or invalid context tracking identifiers.'
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId: tenantId as string,
      appId: appId as string,
    },
  });
});
