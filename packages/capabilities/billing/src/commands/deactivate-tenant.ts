/**
 * Deactivates or sets subscription status to PAST_DUE / DEACTIVATED upon Stripe payment failure.
 */
import { eq } from "drizzle-orm";
import { tenants, type DbOrTx } from "@money-matters/db";

export async function deactivateTenantCommand(
  db: DbOrTx,
  tenantId: string,
  newStatus: "PAST_DUE" | "DEACTIVATED" | "FREE_TIER" = "DEACTIVATED"
): Promise<void> {
  const now = new Date();

  await db
    .update(tenants)
    .set({
      subscriptionStatus: newStatus,
      premiumEnabled: false,
      updatedAt: now,
    })
    .where(eq(tenants.id, tenantId));
}
