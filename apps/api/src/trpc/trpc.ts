import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context.js';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Rule 5 & 10: Enforce JWT-verified session parameter checks for tenantProcedure context scoping
export const tenantProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.tenantId || !ctx.appId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Multi-tenancy boundary isolation violation: Missing or invalid verified session tracking parameters.'
    });
  }

  // Neon DB Auth Context setting block (simulated server-side block setting Neon session variables)
  // In real db connection pool, this executes `SET LOCAL app.current_tenant_id` and `SET LOCAL app.current_app_id`
  // inside the active client transaction before processing queries.

  return next({
    ctx: {
      ...ctx,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      userId: ctx.userId,
    },
  });
});

export const ownerProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  if (ctx.session?.role !== 'OWNER') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Administrative permission required: Command scoped to OWNER privilege role only.'
    });
  }
  return next();
});
