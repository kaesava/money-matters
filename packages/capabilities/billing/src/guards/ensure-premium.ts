import { DbOrTx } from "@money-matters/db";
import { getSubscriptionStatus } from "../queries/get-subscription-status.js";

/**
 * Asserts that a tenant has an active trial, trial grace period, or active Premium subscription.
 * Throws a human-readable error if the tenant is on FREE_TIER or DEACTIVATED.
 */
export async function ensurePremiumAccess(
  db: DbOrTx,
  tenantId: string,
  featureName: string = "This feature"
): Promise<void> {
  const subStatus = await getSubscriptionStatus(db, tenantId);
  if (subStatus.isFreeTier || subStatus.isDeactivated) {
    throw new Error(`${featureName} requires an active Premium subscription or trial.`);
  }
}
