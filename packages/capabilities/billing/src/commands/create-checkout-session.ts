/**
 * Creates a Stripe Checkout Session for subscription checkout.
 * Resolves or creates Stripe Customer object for the tenant.
 */
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { tenants, type DbOrTx } from "@money-matters/db";
import { validateEnv } from "@money-matters/config";

function isWhitelistedUrl(target: string): boolean {
  if (!target) return false;
  if (target.startsWith("moneymatters://")) return true;
  try {
    const parsed = new URL(target);
    const host = parsed.hostname;
    return (
      host === "kaesava.au" ||
      host.endsWith(".kaesava.au") ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

export async function createCheckoutSessionCommand(
  db: DbOrTx,
  tenantId: string,
  userEmail: string,
  input: { priceId?: string; planType?: "monthly" | "annual" | "founding"; successUrl: string; cancelUrl: string }
): Promise<{ url: string }> {
  if (!isWhitelistedUrl(input.successUrl) || !isWhitelistedUrl(input.cancelUrl)) {
    throw new Error("Invalid redirect URL: target domain is not authorized.");
  }

  const env = validateEnv();
  const stripeSecretKey = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Stripe secret key is not configured.");
  }

  // Resolve target price ID from input or environment variables
  let targetPriceId = input.priceId;

  if (input.planType === "monthly") {
    targetPriceId = env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_MONTHLY || targetPriceId;
  } else if (input.planType === "founding") {
    targetPriceId = env.STRIPE_PRICE_FOUNDING_ANNUAL || process.env.STRIPE_PRICE_FOUNDING_ANNUAL || targetPriceId;
  } else if (input.planType === "annual") {
    targetPriceId = env.STRIPE_PRICE_ANNUAL || process.env.STRIPE_PRICE_ANNUAL || targetPriceId;
  }

  // Fallback to general price env if not resolved yet
  if (!targetPriceId) {
    targetPriceId =
      env.STRIPE_PRICE_ANNUAL ||
      process.env.STRIPE_PRICE_ANNUAL ||
      env.STRIPE_PRICE_MONTHLY ||
      process.env.STRIPE_PRICE_MONTHLY;
  }

  if (!targetPriceId) {
    throw new Error("No valid Stripe Price ID configured for checkout.");
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

  const successUrlWithSessionId = input.successUrl.includes("{CHECKOUT_SESSION_ID}")
    ? input.successUrl
    : `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: targetPriceId,
        quantity: 1,
      },
    ],
    success_url: successUrlWithSessionId,
    cancel_url: input.cancelUrl,
    client_reference_id: tenantId,
    subscription_data: {
      metadata: {
        tenantId,
        planType: input.planType || "annual",
      },
    },
    metadata: {
      tenantId,
      planType: input.planType || "annual",
    },
  });

  if (!session.url) {
    throw new Error("Failed to create Stripe checkout session URL.");
  }

  return { url: session.url };
}
