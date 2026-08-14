/**
 * Stripe webhook processor.
 * Requires raw request body string for cryptographic signature verification.
 */
import Stripe from "stripe";
import { validateEnv } from "@money-matters/config";
import { type DbOrTx } from "@money-matters/db";
import { activateSubscriptionCommand } from "../commands/activate-subscription.js";
import { deactivateTenantCommand } from "../commands/deactivate-tenant.js";
import { transitionToFreeTierCommand } from "../commands/transition-to-free-tier.js";

export async function handleStripeWebhook(
  rawBody: string,
  signature: string,
  webhookSecret: string,
  db: DbOrTx
): Promise<{ processed: boolean; eventType: string }> {
  const env = validateEnv();
  const stripeSecretKey = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Stripe secret key is not configured.");
  }

  const stripe = new Stripe(stripeSecretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    throw new Error(`Stripe webhook signature verification failed: ${(err as Error).message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.client_reference_id || (session.metadata && session.metadata.tenantId);

      if (tenantId && session.subscription && session.customer) {
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || "";

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price.id || "";
        const currentPeriodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await activateSubscriptionCommand(db, {
          tenantId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: priceId,
          subscriptionEndsAt: currentPeriodEnd,
        });
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;

      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const tenantId = sub.metadata?.tenantId;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
        const priceId = sub.items.data[0]?.price.id || "";
        const currentPeriodEnd = new Date(sub.current_period_end * 1000);

        if (tenantId) {
          await activateSubscriptionCommand(db, {
            tenantId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            subscriptionEndsAt: currentPeriodEnd,
          });
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;

      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const tenantId = sub.metadata?.tenantId;
        if (tenantId) {
          // Grant 7-day read-only grace period before reverting to Free Tier
          await deactivateTenantCommand(db, tenantId, "GRACE_PERIOD");
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = sub.metadata?.tenantId;
      if (tenantId) {
        // Grant 7-day read-only grace period before reverting to Free Tier
        await deactivateTenantCommand(db, tenantId, "GRACE_PERIOD");
      }
      break;
    }


    default:
      break;
  }

  return { processed: true, eventType: event.type };
}
