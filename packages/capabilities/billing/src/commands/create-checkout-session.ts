/**
 * Creates a Stripe Checkout Session for subscription checkout.
 * Resolves or creates Stripe Customer object for the tenant.
 */
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { tenants, type DbOrTx } from "@money-matters/db";
import { validateEnv } from "@money-matters/config";

export async function createCheckoutSessionCommand(
  db: DbOrTx,
  tenantId: string,
  userEmail: string,
  input: { priceId: string; successUrl: string; cancelUrl: string }
): Promise<{ url: string }> {
  const env = validateEnv();
  const stripeSecretKey = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Stripe secret key configuration is missing.");
  }

  const stripe = new Stripe(stripeSecretKey);

  const [tenant] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      stripeCustomerId: tenants.stripeCustomerId,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  let customerId = tenant.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      name: tenant.name,
      metadata: {
        tenantId: tenant.id,
      },
    });

    customerId = customer.id;

    await db
      .update(tenants)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: input.priceId,
        quantity: 1,
      },
    ],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: tenantId,
    subscription_data: {
      metadata: {
        tenantId,
      },
    },
  });

  if (!session.url) {
    throw new Error("Failed to create Stripe checkout session URL.");
  }

  return { url: session.url };
}
