import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create();

const isAuthedTenant = t.middleware(({ ctx, next }) => {
  if (!ctx.tenantId || !ctx.appId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Multi-tenant verification failure." });
  }
  return next({
    ctx: { tenantId: ctx.tenantId, appId: ctx.appId }
  });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const tenantProcedure = t.procedure.use(isAuthedTenant);
