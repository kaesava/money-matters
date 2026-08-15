import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context.js';

import { db } from '@money-matters/db';
import { sql } from 'drizzle-orm';
import { getSubscriptionStatus } from '@money-matters/capability-billing';
import type { SubscriptionStatusDto } from '@money-matters/types';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Requires a verified Neon Auth JWT but does NOT require an active tenant.
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
 * Enforces PostgreSQL RLS by setting session variable inside transaction.
 * Resolves subscriptionStatus and gates DEACTIVATED tenants.
 */
export const tenantProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.tenantId || !ctx.appId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Multi-tenancy boundary isolation violation: Missing or invalid verified session tracking parameters.',
    });
  }

  // Wrap the call in a database transaction to scope the SET LOCAL session setting.
  return await ctx.db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${ctx.tenantId}, true)`);

    const subscriptionStatus = await getSubscriptionStatus(tx, ctx.tenantId);

    if (subscriptionStatus.isDeactivated) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'subscription_deactivated: Household account access is paused.',
      });
    }

    return next({
      ctx: {
        ...ctx,
        db: tx, // transactional database client with RLS active
        tenantId: ctx.tenantId,
        appId: ctx.appId,
        userId: ctx.userId,
        subscriptionStatus,
      },
    });
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

/**
 * Throws TRPCError FORBIDDEN if tenant is in read-only grace period.
 */
export function requiresWriteAccess(ctx: { subscriptionStatus: SubscriptionStatusDto }) {
  if (ctx.subscriptionStatus.isTrialGrace) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'subscription_read_only: Read-only mode active. Upgrade to make changes.',
    });
  }
}

/**
 * Throws TRPCError FORBIDDEN if trial has expired.
 */
export function requiresPaidTier(ctx: { subscriptionStatus: SubscriptionStatusDto }, featureName: string) {
  if (ctx.subscriptionStatus.isTrialExpired || ctx.subscriptionStatus.isDeactivated) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `subscription_trial_expired:${featureName}`,
    });
  }
}

/**
 * Requires an active trial or paid subscription.
 * Rejects TRIAL_EXPIRED or DEACTIVATED tenants.
 */
export const premiumProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  if (ctx.subscriptionStatus.isTrialExpired || ctx.subscriptionStatus.isDeactivated) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'subscription_premium_required: Active subscription or unexpired 60-day trial required.',
    });
  }
  return next();
});


