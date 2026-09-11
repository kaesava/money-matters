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
      cancelAtPeriodEnd: tenants.cancelAtPeriodEnd,
      planType: tenants.planType,
      nextBillingAt: tenants.nextBillingAt,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  let rawStatus = tenant.subscriptionStatus || "TRIAL_ACTIVE";
  const now = new Date();

  // If status is TRIAL_ACTIVE, check if 60-day trial or 7-day grace period has elapsed
  if (rawStatus === "TRIAL_ACTIVE" && tenant.trialEndsAt) {
    const trialExpiry = new Date(tenant.trialEndsAt);
    const graceExpiry = tenant.trialGraceEndsAt
      ? new Date(tenant.trialGraceEndsAt)
      : new Date(trialExpiry.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (now > graceExpiry) {
      rawStatus = "TRIAL_EXPIRED";
      await db
        .update(tenants)
        .set({ subscriptionStatus: "TRIAL_EXPIRED", premiumEnabled: false, updatedAt: now })
        .where(eq(tenants.id, tenantId));
    } else if (now > trialExpiry) {
      rawStatus = "TRIAL_GRACE";
      await db
        .update(tenants)
        .set({ subscriptionStatus: "TRIAL_GRACE", updatedAt: now })
        .where(eq(tenants.id, tenantId));
    }
  }

  // If status is TRIAL_GRACE, check if the 7-day grace period has elapsed
  if (rawStatus === "TRIAL_GRACE" && tenant.trialGraceEndsAt) {
    const graceExpiry = new Date(tenant.trialGraceEndsAt);
    if (now > graceExpiry) {
      rawStatus = "TRIAL_EXPIRED";
      await db
        .update(tenants)
        .set({ subscriptionStatus: "TRIAL_EXPIRED", premiumEnabled: false, updatedAt: now })
        .where(eq(tenants.id, tenantId));
    }
  }

  // If status is SUBSCRIBED but scheduled for cancellation and period has ended
  if (rawStatus === "SUBSCRIBED" && tenant.cancelAtPeriodEnd && tenant.subscriptionEndsAt) {
    const periodEnd = new Date(tenant.subscriptionEndsAt);
    if (now > periodEnd) {
      rawStatus = "TRIAL_EXPIRED";
      await db
        .update(tenants)
        .set({ subscriptionStatus: "TRIAL_EXPIRED", premiumEnabled: false, updatedAt: now })
        .where(eq(tenants.id, tenantId));
    }
  }

  // If status is PAST_DUE, check if the 7-day grace period has expired
  if (rawStatus === "PAST_DUE" && tenant.trialGraceEndsAt) {
    const graceExpiry = new Date(tenant.trialGraceEndsAt);
    if (now > graceExpiry) {
      rawStatus = "TRIAL_EXPIRED";
      await db
        .update(tenants)
        .set({ subscriptionStatus: "TRIAL_EXPIRED", premiumEnabled: false, updatedAt: now })
        .where(eq(tenants.id, tenantId));
    }
  }

  const status = rawStatus as TSubscriptionStatusDto["status"];
  const daysRemainingInTrial = tenant.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return SubscriptionStatusDto.parse({
    status,
    trialEndsAt: tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null,
    trialGraceEndsAt: tenant.trialGraceEndsAt ? new Date(tenant.trialGraceEndsAt) : null,
    subscriptionEndsAt: tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt) : null,
    isTrialActive: status === "TRIAL_ACTIVE" && (daysRemainingInTrial === null || daysRemainingInTrial > 0),
    isTrialGrace: status === "TRIAL_GRACE" || (status === "PAST_DUE" && tenant.trialGraceEndsAt && new Date(tenant.trialGraceEndsAt) > now),
    isTrialExpired: status === "TRIAL_EXPIRED" || (status === "TRIAL_ACTIVE" && daysRemainingInTrial === 0),
    isSubscribed: status === "SUBSCRIBED",
    isPastDue: status === "PAST_DUE",
    isDeactivated: status === "DEACTIVATED",
    daysRemainingInTrial,
    cancelAtPeriodEnd: tenant.cancelAtPeriodEnd ?? false,
    planType: (tenant.planType as any) ?? null,
    nextBillingAt: tenant.nextBillingAt ? new Date(tenant.nextBillingAt) : null,
  });
}

