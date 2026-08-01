/**
 * Resolves the current billing/subscription state for a tenant.
 * Calculates days remaining in trial and derives typed boolean flags.
 */
import { eq } from "drizzle-orm";
import { tenants, type DbOrTx } from "@money-matters/db";
import { SubscriptionStatusDto } from "@money-matters/types";
import type { SubscriptionStatusDto as TSubscriptionStatusDto } from "@money-matters/types";

export async function getSubscriptionStatus(
  db: DbOrTx,
  tenantId: string
): Promise<TSubscriptionStatusDto> {
  const [tenant] = await db
    .select({
      subscriptionStatus: tenants.subscriptionStatus,
      trialEndsAt: tenants.trialEndsAt,
      trialGraceEndsAt: tenants.trialGraceEndsAt,
      subscriptionEndsAt: tenants.subscriptionEndsAt,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  const status = (tenant.subscriptionStatus || "TRIAL_ACTIVE") as TSubscriptionStatusDto["status"];
  const now = new Date();
  const daysRemainingInTrial = tenant.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return SubscriptionStatusDto.parse({
    status,
    trialEndsAt: tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null,
    trialGraceEndsAt: tenant.trialGraceEndsAt ? new Date(tenant.trialGraceEndsAt) : null,
    subscriptionEndsAt: tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt) : null,
    isTrialActive: status === "TRIAL_ACTIVE",
    isTrialGrace: status === "TRIAL_GRACE",
    isFreeTier: status === "FREE_TIER",
    isSubscribed: status === "SUBSCRIBED",
    isPastDue: status === "PAST_DUE",
    isDeactivated: status === "DEACTIVATED",
    daysRemainingInTrial,
  });
}
