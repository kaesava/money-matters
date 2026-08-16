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
  input: { priceId?: string; planType?: "monthly" | "annual" | "founding"; successUrl: string; cancelUrl: string }
): Promise<{ url: string }> {
  const env = validateEnv();
  const stripeSecretKey = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

  // Resolve target price ID from input or environment variables
  let targetPriceId = input.priceId;

  if (input.planType === "monthly" || (!targetPriceId && env.STRIPE_PRICE_MONTHLY)) {
    targetPriceId = env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_MONTHLY || targetPriceId;
  } else if (input.planType === "founding" || (!targetPriceId && env.STRIPE_PRICE_FOUNDING_ANNUAL)) {
    targetPriceId = env.STRIPE_PRICE_FOUNDING_ANNUAL || process.env.STRIPE_PRICE_FOUNDING_ANNUAL || targetPriceId;
  } else if (input.planType === "annual" || (!targetPriceId && env.STRIPE_PRICE_ANNUAL)) {
    targetPriceId = env.STRIPE_PRICE_ANNUAL || process.env.STRIPE_PRICE_ANNUAL || targetPriceId;
  }

  // Fallback to general price env if not resolved yet
  if (!targetPriceId || targetPriceId.startsWith("price_mock_")) {
    targetPriceId =
      env.STRIPE_PRICE_ANNUAL ||
      process.env.STRIPE_PRICE_ANNUAL ||
      env.STRIPE_PRICE_MONTHLY ||
      process.env.STRIPE_PRICE_MONTHLY ||
      targetPriceId;
  }

  // Development / Mock Checkout Fallback if Stripe key is missing or dummy mock price ID is passed
  const isMockMode =
    !stripeSecretKey ||
    stripeSecretKey.includes("replace_me") ||
    stripeSecretKey.includes("sk_test_mock") ||
    !targetPriceId ||
    targetPriceId.startsWith("price_mock_");

  if (isMockMode) {
    // In dev / mock mode, grant subscription status directly or return mock success URL
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (tenant) {
      const now = new Date();
      const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      await db
        .update(tenants)
        .set({
          subscriptionStatus: "ACTIVE",
          premiumEnabled: true,
          subscribedAt: now,
          subscriptionEndsAt: oneYearLater,
          updatedAt: now,
        })
        .where(eq(tenants.id, tenantId));
    }

    const mockSuccessUrl = new URL(input.successUrl);
    mockSuccessUrl.searchParams.set("session_id", "mock_checkout_session_success");
    mockSuccessUrl.searchParams.set("mock", "true");
    return { url: mockSuccessUrl.toString() };
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
        price: targetPriceId,
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
