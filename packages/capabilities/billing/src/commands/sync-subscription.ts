/**
 * Synchronizes tenant subscription status and invoice history directly from Stripe.
 * Provides on-demand reconciliation when returning from the Stripe Customer Portal
 * or recovering from missed webhooks.
 */
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { tenants, billingInvoices, type DbOrTx } from "@money-matters/db";
import { validateEnv } from "@money-matters/config";
import type { SubscriptionStatusDto } from "@money-matters/types";
import { getSubscriptionStatus } from "../queries/get-subscription-status.js";

export async function syncSubscriptionCommand(
  db: DbOrTx,
  tenantId: string
): Promise<SubscriptionStatusDto> {
  const env = validateEnv();
  const stripeSecretKey = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  // If no Stripe customer profile exists or Stripe key is dummy/missing, return current local state
  if (
    !tenant.stripeCustomerId ||
    !stripeSecretKey ||
    stripeSecretKey.includes("replace_me") ||
    stripeSecretKey.includes("sk_test_mock")
  ) {
    return await getSubscriptionStatus(db, tenantId);
  }

  const stripe = new Stripe(stripeSecretKey);

  try {
    // 1. Fetch latest subscriptions for this customer
    const subList = await stripe.subscriptions.list({
      customer: tenant.stripeCustomerId,
      limit: 5,
      status: "all",
    });

    // Select active/trialing/past_due subscription first, or most recent
    const sub =
      subList.data.find((s) => ["active", "trialing", "past_due", "unpaid"].includes(s.status)) ||
      subList.data[0];

    const now = new Date();

    if (sub) {
      const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
      const subscriptionEndsAt = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null;
      const nextBillingAt = cancelAtPeriodEnd ? null : subscriptionEndsAt;

      // Determine plan type from metadata or recurring interval
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
      } else if (cancelAtPeriodEnd && subscriptionEndsAt && now > subscriptionEndsAt) {
        subscriptionStatus = "TRIAL_EXPIRED";
        premiumEnabled = false;
      }

      await db
        .update(tenants)
        .set({
          subscriptionStatus,
          premiumEnabled,
          stripeSubscriptionId: sub.id,
          stripePriceId: itemPrice?.id || tenant.stripePriceId,
          cancelAtPeriodEnd,
          subscriptionEndsAt,
          nextBillingAt,
          planType,
          updatedAt: now,
        })
        .where(eq(tenants.id, tenantId));
    }

    // 2. Fetch and upsert recent invoices for direct PDF receipt downloads
    const invoices = await stripe.invoices.list({
      customer: tenant.stripeCustomerId,
      limit: 10,
    });

    for (const inv of invoices.data) {
      if (inv.id) {
        await db
          .insert(billingInvoices)
          .values({
            tenantId,
            stripeInvoiceId: inv.id,
            stripeCustomerId: tenant.stripeCustomerId,
            stripeSubscriptionId: typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id || null,
            amountPaid: ((inv.amount_paid || 0) / 100).toFixed(2),
            currency: (inv.currency || "aud").toUpperCase(),
            status: inv.status || "paid",
            paidAt: inv.status_transitions?.paid_at
              ? new Date(inv.status_transitions.paid_at * 1000)
              : new Date(),
            periodStart: inv.period_start ? new Date(inv.period_start * 1000) : null,
            periodEnd: inv.period_end ? new Date(inv.period_end * 1000) : null,
            invoicePdfUrl: inv.invoice_pdf || null,
            hostedInvoiceUrl: inv.hosted_invoice_url || null,
          })
          .onConflictDoNothing();
      }
    }
  } catch (err) {
    // Non-blocking catch to allow graceful fallback to current local state
    console.warn("[syncSubscriptionCommand] Error syncing with Stripe:", err);
  }

  return await getSubscriptionStatus(db, tenantId);
}
