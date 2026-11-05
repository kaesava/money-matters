import { type DbOrTx, tenants } from "@money-matters/db";
import { eq } from "drizzle-orm";

export async function resolveTenantId(
  db: DbOrTx,
  metadataTenantId?: string | null,
  customerId?: string | null,
  subscriptionId?: string | null
): Promise<string | null> {
  if (metadataTenantId) {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, metadataTenantId))
      .limit(1);
    if (tenant) return tenant.id;
  }
  if (subscriptionId) {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.stripeSubscriptionId, subscriptionId))
      .limit(1);
    if (tenant) return tenant.id;
  }
  if (customerId) {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.stripeCustomerId, customerId))
      .limit(1);
    if (tenant) return tenant.id;
  }
  return null;
}
