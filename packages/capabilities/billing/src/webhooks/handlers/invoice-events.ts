import Stripe from "stripe";
import { z } from "zod";
import { type DbOrTx, billingInvoices } from "@money-matters/db";
import { getCachedDateFormat, sendNotificationEmail } from "@money-matters/core";
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@money-matters/types";
import { activateSubscriptionCommand } from "../../commands/activate-subscription.js";
import { deactivateTenantCommand } from "../../commands/deactivate-tenant.js";
import { resolveTenantId } from "./resolve-tenant.js";

export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  db: DbOrTx
): Promise<void> {
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
  const tenantId = await resolveTenantId(db, sub.metadata?.tenantId, customerId, subscriptionId);
  if (!tenantId) return;

  const priceId = sub.items.data[0]?.price.id || "";
  const currentPeriodEnd = new Date(sub.current_period_end * 1000);
  const planTypeResult = z.enum(["monthly", "annual", "founding"]).safeParse(sub.metadata?.planType);
  const planType: "monthly" | "annual" | "founding" = planTypeResult.success ? planTypeResult.data : "annual";

  await activateSubscriptionCommand(db, {
    tenantId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    subscriptionEndsAt: currentPeriodEnd,
    planType,
  });

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

  const customerEmail =
    invoice.customer_email ||
    (invoice.customer !== null && typeof invoice.customer === "object" && !("deleted" in invoice.customer)
      ? (invoice.customer as Stripe.Customer).email
      : null);

  if (customerEmail) {
    const formattedAmount = `$${((invoice.amount_paid || 0) / 100).toFixed(2)} AUD`;
    const formattedEndDate = getCachedDateFormat(DEFAULT_LOCALE, { dateStyle: "medium", timeZone: DEFAULT_TIMEZONE }).format(currentPeriodEnd);
    await sendNotificationEmail(
      customerEmail,
      "Your Money Matters Subscription Receipt",
      `Thank you for your payment of ${formattedAmount} for Money Matters Household.\n\nYour subscription is active until ${formattedEndDate}.\n\nYou can view and download your invoice receipt here:\n${invoice.hosted_invoice_url || "https://moneymatters.kaesava.au/dashboard/settings?tab=subscription"}\n\nIf you have any questions, contact our Australian support team at info@moneymatters.kaesava.au.`
    ).catch(() => {});
  }
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  db: DbOrTx
): Promise<void> {
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
  const tenantId = await resolveTenantId(db, sub.metadata?.tenantId, customerId, subscriptionId);
  if (!tenantId) return;

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

  await deactivateTenantCommand(db, tenantId, "GRACE_PERIOD");

  const customerEmail =
    invoice.customer_email ||
    (invoice.customer !== null && typeof invoice.customer === "object" && !("deleted" in invoice.customer)
      ? (invoice.customer as Stripe.Customer).email
      : null);

  if (customerEmail) {
    await sendNotificationEmail(
      customerEmail,
      "⚠️ Payment Action Required — Money Matters Household",
      `We were unable to process your recurring subscription payment for Money Matters Household.\n\nTo prevent interruption to your household budget and data access, please update your payment method via the customer portal:\nhttps://moneymatters.kaesava.au/subscription/manage\n\nNeed assistance? Contact info@moneymatters.kaesava.au.`
    ).catch(() => {});
  }
}
