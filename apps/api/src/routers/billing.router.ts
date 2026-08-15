import { tenantProcedure, ownerProcedure } from '../trpc/trpc.js';
import { CreateCheckoutSessionCommand, CreateCustomerPortalCommand } from '@money-matters/types';
import {
  createCheckoutSessionCommand,
  createCustomerPortalSessionCommand,
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
      const userEmail = ctx.session?.email || 'billing@moneymatters.au';
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

  createCustomerPortalSession: ownerProcedure
    .input(CreateCustomerPortalCommand)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      return createCustomerPortalSessionCommand(ctx.db, tenantId, input);
    }),
};
