/**
 * Activates a 60-day free trial on a tenant upon signup.
 * Sets trial_started_at = now, trial_ends_at = now + 60d, trial_grace_ends_at = now + 67d.
 */
import { eq } from "drizzle-orm";
import { tenants, type DbOrTx } from "@money-matters/db";

export async function activateTrialCommand(
  db: DbOrTx,
  tenantId: string,
  now: Date = new Date()
): Promise<void> {
  const trialStartedAt = now;
  const trialEndsAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const trialGraceEndsAt = new Date(now.getTime() + 67 * 24 * 60 * 60 * 1000);

  await db
    .update(tenants)
    .set({
      subscriptionStatus: "TRIAL_ACTIVE",
      trialStartedAt,
      trialEndsAt,
      trialGraceEndsAt,
      updatedAt: now,
    })
    .where(eq(tenants.id, tenantId));
}
