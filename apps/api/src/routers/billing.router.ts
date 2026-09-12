import { tenantProcedure, ownerProcedure } from '../trpc/trpc.js';
import {
  CreateCheckoutSessionCommand,
  CreateCustomerPortalCommand,
  VerifyCheckoutSessionCommand,
} from '@money-matters/types';
import {
  createCheckoutSessionCommand,
  createCustomerPortalSessionCommand,
  verifyCheckoutSessionCommand,
  listInvoicesQuery,
  syncSubscriptionCommand,
} from '@money-matters/capability-billing';
import { posthog } from '../lib/posthog.js';

export const billingRouter = {
  getSubscriptionStatus: tenantProcedure.query(async ({ ctx }) => {
    return ctx.subscriptionStatus;
  }),

  createCheckoutSession: ownerProcedure
    .input(CreateCheckoutSessionCommand)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userEmail = ctx.session?.email || 'support@moneymatters.kaesava.au';
      const result = await createCheckoutSessionCommand(ctx.db, tenantId, userEmail, input);
      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'checkout_session_created',
          properties: {
            tenant_id: tenantId,
            priceId: input.priceId,
          },
        });
        await posthog.flush();
      }
      return result;
    }),

  verifyCheckoutSession: ownerProcedure
    .input(VerifyCheckoutSessionCommand)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const result = await verifyCheckoutSessionCommand(ctx.db, tenantId, input.sessionId);
      if (posthog && ctx.userId && result.verified) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'subscription_checkout_verified',
          properties: {
            tenant_id: tenantId,
            status: result.subscriptionStatus,
          },
        });
        await posthog.flush();
      }
      return result;
    }),

  createCustomerPortalSession: ownerProcedure
    .input(CreateCustomerPortalCommand)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      return createCustomerPortalSessionCommand(ctx.db, tenantId, input);
    }),

  listInvoices: tenantProcedure.query(async ({ ctx }) => {
    return await listInvoicesQuery(ctx.db, ctx.tenantId!);
  }),

  syncSubscription: ownerProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.tenantId!;
    return await syncSubscriptionCommand(ctx.db, tenantId);
  }),
};

