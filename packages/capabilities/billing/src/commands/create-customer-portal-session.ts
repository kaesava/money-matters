/**
 * Creates a Stripe Customer Portal session link for managing billing.
 */
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { tenants, type DbOrTx } from "@money-matters/db";
import { validateEnv } from "@money-matters/config";

export async function createCustomerPortalSessionCommand(
  db: DbOrTx,
  tenantId: string,
  input: { returnUrl: string }
): Promise<{ url: string }> {
  const env = validateEnv();
  const stripeSecretKey = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Stripe secret key configuration is missing.");
  }

  const stripe = new Stripe(stripeSecretKey);

  const [tenant] = await db
    .select({
      stripeCustomerId: tenants.stripeCustomerId,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant || !tenant.stripeCustomerId) {
    throw new Error("No billing customer profile found for this household.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: input.returnUrl,
  });

  return { url: session.url };
}
