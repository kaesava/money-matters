/**
 * Stripe webhook processor.
 * Requires raw request body string for cryptographic signature verification.
 */
import Stripe from "stripe";
import { validateEnv } from "@money-matters/config";
import { type DbOrTx, processedWebhooks, billingInvoices, tenants } from "@money-matters/db";
import { eq } from "drizzle-orm";
import { sendNotificationEmail } from "@money-matters/core";
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

  // Idempotency check
  const [alreadyProcessed] = await db
    .select()
    .from(processedWebhooks)
    .where(eq(processedWebhooks.eventId, event.id))
    .limit(1);

  if (alreadyProcessed) {
    return { processed: true, eventType: `${event.type} (already_processed)` };
  }

async function resolveTenantId(
  db: DbOrTx,
  metadataTenantId?: string | null,
  customerId?: string | null,
  subscriptionId?: string | null
): Promise<string | null> {
  if (metadataTenantId) {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, metadataTenantId))
      .limit(1);
    if (tenant) return tenant.id;
  }
  if (subscriptionId) {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.stripeSubscriptionId, subscriptionId))
      .limit(1);
    if (tenant) return tenant.id;
  }
  if (customerId) {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.stripeCustomerId, customerId))
      .limit(1);
    if (tenant) return tenant.id;
  }
  return null;
}

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const rawTenantId = session.client_reference_id || (session.metadata && session.metadata.tenantId);
      const planType = (session.metadata?.planType as any) || "annual";

      if (session.subscription && session.customer) {
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || "";
        const tenantId = await resolveTenantId(db, rawTenantId, customerId, subscriptionId);

        if (tenantId) {
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
            planType,
          });
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
      const tenantId = await resolveTenantId(db, sub.metadata?.tenantId, customerId, sub.id);

      if (tenantId) {
        const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
        const subscriptionEndsAt = sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined;
        const nextBillingAt = cancelAtPeriodEnd ? null : subscriptionEndsAt;
        const itemPrice = sub.items.data[0]?.price;
        const interval = itemPrice?.recurring?.interval;
        let planType: "monthly" | "annual" | "founding" = "annual";
        if (sub.metadata?.planType === "founding") {
          planType = "founding";
        } else if (interval === "month") {
          planType = "monthly";
        } else {
          planType = "annual";
        }

        let subscriptionStatus: "SUBSCRIBED" | "PAST_DUE" | "TRIAL_EXPIRED" = "SUBSCRIBED";
        let premiumEnabled = true;

        if (sub.status === "past_due" || sub.status === "unpaid") {
          subscriptionStatus = "PAST_DUE";
          premiumEnabled = false;
        } else if (sub.status === "canceled") {
          subscriptionStatus = "TRIAL_EXPIRED";
          premiumEnabled = false;
        } else if (cancelAtPeriodEnd && subscriptionEndsAt && new Date() > subscriptionEndsAt) {
          subscriptionStatus = "TRIAL_EXPIRED";
          premiumEnabled = false;
        }

        await db
          .update(tenants)
          .set({
            subscriptionStatus,
            premiumEnabled,
            cancelAtPeriodEnd,
            subscriptionEndsAt,
            nextBillingAt,
            stripeSubscriptionId: sub.id,
            ...(itemPrice?.id ? { stripePriceId: itemPrice.id } : {}),
            planType,
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, tenantId));
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;

      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
        const tenantId = await resolveTenantId(db, sub.metadata?.tenantId, customerId, subscriptionId);
        const priceId = sub.items.data[0]?.price.id || "";
        const currentPeriodEnd = new Date(sub.current_period_end * 1000);
        const planType = (sub.metadata?.planType as any) || "annual";

        if (tenantId) {
          await activateSubscriptionCommand(db, {
            tenantId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            subscriptionEndsAt: currentPeriodEnd,
            planType,
          });

          // Record invoice in billingInvoices table
          if (invoice.id) {
            await db
              .insert(billingInvoices)
              .values({
                tenantId,
                stripeInvoiceId: invoice.id,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                amountPaid: ((invoice.amount_paid || 0) / 100).toFixed(2),
                currency: (invoice.currency || "aud").toUpperCase(),
                status: invoice.status || "paid",
                paidAt: invoice.status_transitions?.paid_at
                  ? new Date(invoice.status_transitions.paid_at * 1000)
                  : new Date(),
                periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
                periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
                invoicePdfUrl: invoice.invoice_pdf || null,
                hostedInvoiceUrl: invoice.hosted_invoice_url || null,
              })
              .onConflictDoNothing();
          }

          // Dispatch confirmation receipt email if customer email exists
          const customerEmail = invoice.customer_email || (typeof invoice.customer === "object" ? (invoice.customer as any)?.email : null);
          if (customerEmail) {
            const formattedAmount = `$${((invoice.amount_paid || 0) / 100).toFixed(2)} AUD`;
            await sendNotificationEmail(
              customerEmail,
              "Your Money Matters Subscription Receipt",
              `Thank you for your payment of ${formattedAmount} for Money Matters Household.\n\nYour subscription is active until ${currentPeriodEnd.toLocaleDateString("en-AU")}.\n\nYou can view and download your invoice receipt here:\n${invoice.hosted_invoice_url || "https://moneymatters.kaesava.au/dashboard/settings?tab=account-data"}\n\nIf you have any questions, contact our Australian support team at support@moneymatters.kaesava.au.`
            ).catch(() => {});
          }
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;

      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
        const tenantId = await resolveTenantId(db, sub.metadata?.tenantId, customerId, subscriptionId);

        if (tenantId) {
          // Record failed invoice
          if (invoice.id) {
            await db
              .insert(billingInvoices)
              .values({
                tenantId,
                stripeInvoiceId: invoice.id,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                amountPaid: "0.00",
                currency: (invoice.currency || "aud").toUpperCase(),
                status: "payment_failed",
                paidAt: null,
                periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
                periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
                invoicePdfUrl: invoice.invoice_pdf || null,
                hostedInvoiceUrl: invoice.hosted_invoice_url || null,
              })
              .onConflictDoNothing();
          }

          // Grant 7-day read-only grace period
          await deactivateTenantCommand(db, tenantId, "GRACE_PERIOD");

          // Send payment failure alert email
          const customerEmail = invoice.customer_email || (typeof invoice.customer === "object" ? (invoice.customer as any)?.email : null);
          if (customerEmail) {
            await sendNotificationEmail(
              customerEmail,
              "⚠️ Payment Action Required — Money Matters Household",
              `We were unable to process your recurring subscription payment for Money Matters Household.\n\nTo prevent interruption to your household budget and data access, please update your payment method via the customer portal:\nhttps://moneymatters.kaesava.au/subscription/manage\n\nNeed assistance? Contact support@moneymatters.kaesava.au.`
            ).catch(() => {});
          }
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
      const tenantId = await resolveTenantId(db, sub.metadata?.tenantId, customerId, sub.id);

      if (tenantId) {
        // Transition immediately to expired holding screen per agreed design
        await db
          .update(tenants)
          .set({
            subscriptionStatus: "TRIAL_EXPIRED",
            premiumEnabled: false,
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, tenantId));
      }
      break;
    }

    default:
      break;
  }

  await db.insert(processedWebhooks).values({
    eventId: event.id,
    eventType: event.type,
    processedAt: new Date(),
  }).onConflictDoNothing();

  return { processed: true, eventType: event.type };
}
