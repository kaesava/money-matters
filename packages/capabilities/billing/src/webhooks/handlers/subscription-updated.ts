import Stripe from "stripe";
import { type DbOrTx, tenants } from "@money-matters/db";
import { eq } from "drizzle-orm";
import { resolveTenantId } from "./resolve-tenant.js";

export async function handleSubscriptionUpdated(
  sub: Stripe.Subscription,
  db: DbOrTx
): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
  const tenantId = await resolveTenantId(db, sub.metadata?.tenantId, customerId, sub.id);

  if (!tenantId) return;

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

export async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
  db: DbOrTx
): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
  const tenantId = await resolveTenantId(db, sub.metadata?.tenantId, customerId, sub.id);

  if (tenantId) {
    await db
      .update(tenants)
      .set({
        subscriptionStatus: "TRIAL_EXPIRED",
        premiumEnabled: false,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));
  }
}
