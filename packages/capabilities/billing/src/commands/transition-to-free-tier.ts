/**
 * Transitions a tenant to TRIAL_EXPIRED after trial/grace period expires or upon subscription cancellation.
 */
import { eq } from "drizzle-orm";
import { tenants, type DbOrTx } from "@money-matters/db";

export async function transitionToFreeTierCommand(
  db: DbOrTx,
  tenantId: string
): Promise<void> {
  const now = new Date();

  await db
    .update(tenants)
    .set({
      subscriptionStatus: "TRIAL_EXPIRED",
      premiumEnabled: false,
      updatedAt: now,
    })
    .where(eq(tenants.id, tenantId));
}
