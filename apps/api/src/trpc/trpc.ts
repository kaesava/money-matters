import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context.js';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Requires a verified Neon Auth JWT but does NOT require an active tenant (tenant).
 * Use for sign-up flows and onboarding endpoints where a tenant doesn't exist yet.
 */
export const authenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.session.userId,
      email: ctx.session.email,
    },
  });
});

/**
 * Requires a verified JWT AND an active tenant membership.
 * Enforces tenant isolation: all queries must be scoped to ctx.tenantId.
 */
export const tenantProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.tenantId || !ctx.appId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Multi-tenancy boundary isolation violation: Missing or invalid verified session tracking parameters.',
    });
  }

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
      message: 'Administrative permission required: Command scoped to OWNER privilege role only.',
    });
  }
  return next();
});
