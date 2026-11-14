import { DbOrTx, tenants } from "@money-matters/db";
import { eq } from "drizzle-orm";

export interface SubscriptionStatusInfo {
  status: "TRIAL_ACTIVE" | "TRIAL_EXPIRED" | "SUBSCRIBED" | "PAST_DUE" | "DEACTIVATED";
  isTrialExpired: boolean;
  isDeactivated: boolean;
}

/**
 * Shared core guard asserting that a tenant has active trial or subscription access.
 */
export async function ensurePremiumAccess(
  db: DbOrTx,
  tenantId: string,
  featureName: string = "This feature"
): Promise<void> {
  const [tenant] = await db
    .select({
      subscriptionStatus: tenants.subscriptionStatus,
      trialEndsAt: tenants.trialEndsAt,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) return;

  const now = new Date();
  const trialExpired = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) < now : false;
  const isDeactivated = tenant.subscriptionStatus === "DEACTIVATED";
  const isExpired = tenant.subscriptionStatus === "TRIAL_EXPIRED" || (tenant.subscriptionStatus === "TRIAL_ACTIVE" && trialExpired);

  if (isExpired || isDeactivated) {
    throw new Error(`${featureName} requires an active subscription or unexpired 60-day trial.`);
  }
}
