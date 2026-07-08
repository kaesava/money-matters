import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Enforce tenant isolation for all protected procedures
export const tenantProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.tenantId || !ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    },
  });
});
