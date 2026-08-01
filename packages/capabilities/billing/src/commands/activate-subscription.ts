/**
 * Activates or renews a tenant subscription upon receiving Stripe payment webhooks.
 * Updates subscriptionStatus = 'SUBSCRIBED', premiumEnabled = true.
 */
import { eq } from "drizzle-orm";
import { tenants, type DbOrTx } from "@money-matters/db";

export async function activateSubscriptionCommand(
  db: DbOrTx,
  params: {
    tenantId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    stripePriceId: string;
    subscriptionEndsAt: Date;
  }
): Promise<void> {
  const now = new Date();

  await db
    .update(tenants)
    .set({
      subscriptionStatus: "SUBSCRIBED",
      premiumEnabled: true,
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      stripePriceId: params.stripePriceId,
      subscribedAt: now,
      subscriptionEndsAt: params.subscriptionEndsAt,
      updatedAt: now,
    })
    .where(eq(tenants.id, params.tenantId));
}
