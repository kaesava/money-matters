/**
 * Deactivates or sets subscription status to PAST_DUE / DEACTIVATED upon Stripe payment failure.
 */
import { eq } from "drizzle-orm";
import { tenants, type DbOrTx } from "@money-matters/db";

export async function deactivateTenantCommand(
  db: DbOrTx,
  tenantId: string,
  newStatus: "PAST_DUE" | "DEACTIVATED" | "FREE_TIER" | "GRACE_PERIOD" = "DEACTIVATED"
): Promise<void> {
  const now = new Date();
  const graceEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await db
    .update(tenants)
    .set({
      subscriptionStatus: newStatus === "GRACE_PERIOD" ? "PAST_DUE" : newStatus,
      premiumEnabled: false,
      trialGraceEndsAt: graceEndsAt,
      updatedAt: now,
    })
    .where(eq(tenants.id, tenantId));
}

