import { tenantProcedure, ownerProcedure } from '../trpc/trpc.js';
import { CreateCheckoutSessionCommand, CreateCustomerPortalCommand } from '@money-matters/types';
import {
  createCheckoutSessionCommand,
  createCustomerPortalSessionCommand,
} from '@money-matters/capability-billing';

export const billingRouter = {
  getSubscriptionStatus: tenantProcedure.query(async ({ ctx }) => {
    return ctx.subscriptionStatus;
  }),

  createCheckoutSession: ownerProcedure
    .input(CreateCheckoutSessionCommand)
    .mutation(async ({ ctx, input }) => {
      const userEmail = ctx.session?.email || 'billing@moneymatters.au';
      return createCheckoutSessionCommand(ctx.db, ctx.tenantId, userEmail, input);
    }),

  createCustomerPortalSession: ownerProcedure
    .input(CreateCustomerPortalCommand)
    .mutation(async ({ ctx, input }) => {
      return createCustomerPortalSessionCommand(ctx.db, ctx.tenantId, input);
    }),
};
