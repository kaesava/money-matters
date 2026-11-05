/**
 * Stripe webhook processor.
 * Requires raw request body string for cryptographic signature verification.
 */
import Stripe from "stripe";
import { validateEnv } from "@money-matters/config";
import { type DbOrTx, processedWebhooks } from "@money-matters/db";
import { handleCheckoutSessionCompleted } from "./handlers/checkout-completed.js";
import { handleSubscriptionUpdated, handleSubscriptionDeleted } from "./handlers/subscription-updated.js";
import { handleInvoicePaymentSucceeded, handleInvoicePaymentFailed } from "./handlers/invoice-events.js";

export class StripeSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeSignatureError";
  }
}

export async function handleStripeWebhook(
  rawBody: string,
  signature: string,
  webhookSecret: string,
  db: DbOrTx,
  stripeSecretKeyOverride?: string
): Promise<{ processed: boolean; eventType: string }> {
  let stripeSecretKey = stripeSecretKeyOverride || process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    try {
      const env = validateEnv();
      stripeSecretKey = env.STRIPE_SECRET_KEY;
    } catch {
      // Partial harness fallback
    }
  }
  if (!stripeSecretKey) {
    throw new Error("Stripe secret key is not configured.");
  }

  const stripe = new Stripe(stripeSecretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    throw new StripeSignatureError(`Stripe webhook signature verification failed: ${(err as Error).message}`);
  }

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  // Claim-First Idempotency: Atomic claim
  const claimResult = await db
    .insert(processedWebhooks)
    .values({
      eventId: event.id,
      eventType: event.type,
      processedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ eventId: processedWebhooks.eventId });

  if (claimResult.length === 0) {
    return { processed: true, eventType: `${event.type} (already_processed)` };
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, stripe, db);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, db);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, db);
      break;

    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, stripe, db);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, stripe, db);
      break;

    default:
      break;
  }

  return { processed: true, eventType: event.type };
}
