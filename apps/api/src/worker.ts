import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from './routers/_app.js';
import { createEdgeContext } from './trpc/edge-context.js';
import { inngest } from './inngest/client.js';
import { functions } from './inngest/index.js';
import { serve } from 'inngest/cloudflare';

export interface WorkerEnv {
  MONEY_MATTERS_APP_ID: string;
  STORAGE_BUCKET_NAME: string;
  STORAGE_ENDPOINT: string;
  STORAGE_REGION: string;
  GLOBAL_MAX_FILE_SIZE_MB: string;
  NEXT_PUBLIC_NEON_AUTH_URL: string;
  NEON_AUTH_BASE_URL: string;
  NEON_AUTH_JWKS_URL: string;
  DATABASE_URL?: string;
  INNGEST_SIGNING_KEY?: string;
  INNGEST_EVENT_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_MONTHLY?: string;
  STRIPE_PRICE_ANNUAL?: string;
  STRIPE_PRICE_FOUNDING_ANNUAL?: string;
}

export function isValidRedirectUrl(target: string): boolean {
  if (!target) return false;
  if (target.startsWith("moneymatters://")) return true;
  try {
    const parsed = new URL(target);
    const host = parsed.hostname;
    if (
      host === "kaesava.au" ||
      host.endsWith(".kaesava.au") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    }
    return false;
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: { waitUntil: (promise: Promise<unknown>) => void }): Promise<Response> {
    const ALLOWED_ORIGINS = [
      "https://moneymatters.kaesava.au",
      "https://www.moneymatters.kaesava.au",
      "https://api.moneymatters.kaesava.au",
      "https://kaesava.au",
      "https://www.kaesava.au",
    ];
    const requestOrigin = request.headers.get('Origin');
    const isAllowedOrigin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin);
    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowedOrigin ? requestOrigin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, trpc-accept, x-correlation-id',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };
    const securityHeaders = {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };

    try {
      const url = new URL(request.url);

      // 1. Handle CORS Preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: { ...corsHeaders, ...securityHeaders },
        });
      }

      // 2. Handle Health Check Endpoint
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
            ...securityHeaders,
          },
        });
      }

      // 3. Handle Inngest Webhook Endpoint
      if (url.pathname.startsWith('/api/inngest')) {
        const inngestHandler = serve({
          client: inngest,
          functions,
          servePath: '/api/inngest',
          signingKey: env.INNGEST_SIGNING_KEY,
        }) as unknown as (
          request: Request,
          env: Record<string, string | undefined>,
          ctx?: { waitUntil: (promise: Promise<unknown>) => void }
        ) => Promise<Response>;
        return inngestHandler(request, env as unknown as Record<string, string | undefined>, ctx);
      }

      // 3.5 Handle Stripe Webhook Endpoint
      if (url.pathname === '/webhooks/stripe' && request.method === 'POST') {
        const signature = request.headers.get('stripe-signature');
        if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
          return new Response(JSON.stringify({ error: 'Missing stripe-signature or webhook secret' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders },
          });
        }

        const rawBody = await request.text();
        const { db: dbClient } = await import('@money-matters/db');
        const { handleStripeWebhook } = await import('@money-matters/capability-billing');

        const result = await handleStripeWebhook(rawBody, signature, env.STRIPE_WEBHOOK_SECRET, dbClient);

        return new Response(JSON.stringify({ received: true, ...result }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders },
        });
      }

      // 4. Handle Password Reset HTML Endpoint
      if (url.pathname === '/reset-password') {
        const token = url.searchParams.get('token') || '';
        const error = url.searchParams.get('error') || '';
        const requestedRedirect = url.searchParams.get('redirect_to');

        if (requestedRedirect && !isValidRedirectUrl(requestedRedirect)) {
          return new Response(JSON.stringify({ error: 'Invalid or unwhitelisted redirect target domain' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders },
          });
        }

        const redirectTo = (requestedRedirect && isValidRedirectUrl(requestedRedirect))
          ? requestedRedirect
          : 'moneymatters://reset-password';

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password | Money Matters</title>
  <style>
    body { font-family: sans-serif; background-color: #0b132b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: rgba(27, 43, 75, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px; max-width: 420px; text-align: center; }
    .btn { display: inline-block; width: 100%; padding: 16px; background-color: #3b82f6; color: #fff; text-decoration: none; font-weight: 600; border-radius: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Money Matters</h1>
    <p>Your password reset link is ready. Tap below to launch the application.</p>
    <a href="#" id="openAppBtn" class="btn">Open Money Matters App</a>
  </div>
  <script>
    const token = ${JSON.stringify(token)};
    const error = ${JSON.stringify(error)};
    const baseRedirect = ${JSON.stringify(redirectTo)};
    let targetUrl = baseRedirect;
    if (targetUrl.includes('?')) {
      if (error) targetUrl += '&error=' + encodeURIComponent(error);
      if (token) targetUrl += '&token=' + encodeURIComponent(token);
    } else {
      if (error) { targetUrl += '?error=' + encodeURIComponent(error); }
      else if (token) { targetUrl += '?token=' + encodeURIComponent(token); }
    }
    document.getElementById('openAppBtn').href = targetUrl;
    window.location.href = targetUrl;
  </script>
</body>
</html>`;

        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8', ...securityHeaders },
        });
      }

      // 5. Handle tRPC Requests
      if (url.pathname.startsWith('/trpc')) {
        const response = await fetchRequestHandler({
          endpoint: '/trpc',
          req: request,
          router: appRouter,
          createContext: (opts) => createEdgeContext(opts, env),
          onError: ({ error, path }) => {
            console.error(`[tRPC Error] path '${path}':`, error);
          },
        });

        const newHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, val]) => {
          newHeaders.set(key, val);
        });
        Object.entries(securityHeaders).forEach(([key, val]) => {
          newHeaders.set(key, val);
        });
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }

      return new Response(JSON.stringify({ error: 'Route not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
          ...securityHeaders,
        },
      });
    } catch (err: unknown) {
      console.error('[WORKER UNCAUGHT ERROR]', err);
      const message = err instanceof Error ? err.message : 'Internal Server Error';
      return new Response(
        JSON.stringify({
          error: {
            message,
            code: 'INTERNAL_SERVER_ERROR',
          },
        }),

        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
            ...securityHeaders,
          },
        }
      );
    }
  },
};
