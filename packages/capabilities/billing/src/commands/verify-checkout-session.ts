/**
 * Synchronously verifies a completed Stripe Checkout session upon customer redirect to /subscription/success.
 * Immediately activates the subscription and records initial invoice without waiting for webhooks.
 */
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { tenants, billingInvoices, type DbOrTx } from "@money-matters/db";
import { validateEnv } from "@money-matters/config";
import { activateSubscriptionCommand } from "./activate-subscription.js";

export async function verifyCheckoutSessionCommand(
  db: DbOrTx,
  tenantId: string,
  sessionId: string
): Promise<{ verified: boolean; subscriptionStatus: "SUBSCRIBED" | "TRIAL_ACTIVE" }> {
  // Handle dev/mock session ID
  if (sessionId === "mock_checkout_session_success" || sessionId.startsWith("mock_")) {
    const now = new Date();
    const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    await db
      .update(tenants)
      .set({
        subscriptionStatus: "SUBSCRIBED",
        premiumEnabled: true,
        subscribedAt: now,
        subscriptionEndsAt: oneYearLater,
        nextBillingAt: oneYearLater,
        planType: "annual",
        cancelAtPeriodEnd: false,
        trialConvertedAt: now,
        trialGraceEndsAt: null,
        updatedAt: now,
      })
      .where(eq(tenants.id, tenantId));

    return { verified: true, subscriptionStatus: "SUBSCRIBED" };
  }

  const env = validateEnv();
  const stripeSecretKey = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Stripe secret key is not configured.");
  }

  const stripe = new Stripe(stripeSecretKey);

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "invoice"],
  });

  const sessionTenantId = session.client_reference_id || session.metadata?.tenantId;
  if (sessionTenantId && sessionTenantId !== tenantId) {
    throw new Error("Stripe checkout session does not belong to this household.");
  }

  const isComplete = session.status === "complete" || session.payment_status === "paid";
  if (!isComplete) {
    return { verified: false, subscriptionStatus: "TRIAL_ACTIVE" };
  }

  const subscriptionObj = typeof session.subscription === "object" ? session.subscription : null;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : subscriptionObj?.id || "";
  const customerId = typeof session.customer === "string" ? session.customer : (session.customer as any)?.id || "";

  let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  let priceId = "";
  let planType: "monthly" | "annual" | "founding" = (session.metadata?.planType as any) || "annual";

  if (subscriptionObj) {
    priceId = subscriptionObj.items.data[0]?.price.id || "";
    if (subscriptionObj.current_period_end) {
      currentPeriodEnd = new Date(subscriptionObj.current_period_end * 1000);
    }
  } else if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    priceId = sub.items.data[0]?.price.id || "";
    if (sub.current_period_end) {
      currentPeriodEnd = new Date(sub.current_period_end * 1000);
    }
  }

  await activateSubscriptionCommand(db, {
    tenantId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    subscriptionEndsAt: currentPeriodEnd,
    planType,
  });

  // Record initial invoice if available
  const invoiceObj = typeof session.invoice === "object" ? (session.invoice as Stripe.Invoice) : null;
  if (invoiceObj && invoiceObj.id) {
    await db
      .insert(billingInvoices)
      .values({
        tenantId,
        stripeInvoiceId: invoiceObj.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId || null,
        amountPaid: ((invoiceObj.amount_paid || 0) / 100).toFixed(2),
        currency: (invoiceObj.currency || "aud").toUpperCase(),
        status: invoiceObj.status || "paid",
        paidAt: invoiceObj.status_transitions?.paid_at
          ? new Date(invoiceObj.status_transitions.paid_at * 1000)
          : new Date(),
        periodStart: invoiceObj.period_start ? new Date(invoiceObj.period_start * 1000) : null,
        periodEnd: invoiceObj.period_end ? new Date(invoiceObj.period_end * 1000) : null,
        invoicePdfUrl: invoiceObj.invoice_pdf || null,
        hostedInvoiceUrl: invoiceObj.hosted_invoice_url || null,
      })
      .onConflictDoNothing();
  }

  return { verified: true, subscriptionStatus: "SUBSCRIBED" };
}
