import { createDbClient } from '@money-matters/core';
import { handleStripeWebhook } from '@money-matters/capability-billing';

export interface StripeWebhookEnv {
  DATABASE_URL?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
}

export async function handleStripeWebhookRequest(
  request: Request,
  env: StripeWebhookEnv,
  baseHeaders: Record<string, string>
): Promise<Response> {
  const signature = request.headers.get('stripe-signature');
  if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature or webhook secret' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...baseHeaders },
    });
  }

  const rawBody = await request.text();

  try {
    const connectionString = env.DATABASE_URL || process.env.DATABASE_URL;
    const dbClient = connectionString ? createDbClient(connectionString) : null;

    const result = await handleStripeWebhook(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
      dbClient as unknown as Parameters<typeof handleStripeWebhook>[3],
      env.STRIPE_SECRET_KEY
    );

    return new Response(JSON.stringify({ received: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...baseHeaders },
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'StripeSignatureError') {
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...baseHeaders },
      });
    }
    throw err;
  }
}
