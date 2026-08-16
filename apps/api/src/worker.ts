import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { logger, checkRateLimit } from '@money-matters/core';
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

function escapeForScript(val: string): string {
  return JSON.stringify(val || "").replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export function renderPasswordResetHtml(token: string, error: string, redirectTo: string): string {
  const safeToken = escapeForScript(token);
  const safeError = escapeForScript(error);
  const safeRedirectTo = escapeForScript(redirectTo);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password | Money Matters</title>
  <style>
    body { font-family: sans-serif; background-color: #0b132b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: rgba(27, 43, 75, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px; max-width: 420px; text-align: center; }
    .btn { display: inline-block; width: 100%; padding: 16px; background-color: #2563eb; color: #fff; text-decoration: none; font-weight: 600; border-radius: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Money Matters</h1>
    <p>Your password reset link is ready. Tap below to launch the application.</p>
    <a href="#" id="openAppBtn" class="btn">Open Money Matters App</a>
  </div>
  <script>
    const token = ${safeToken};
    const error = ${safeError};
    const baseRedirect = ${safeRedirectTo};
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
}

export async function handleStripeWebhookRequest(
  request: Request,
  env: WorkerEnv,
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
  const { db: dbClient } = await import('@money-matters/db');
  const { handleStripeWebhook } = await import('@money-matters/capability-billing');

  const result = await handleStripeWebhook(rawBody, signature, env.STRIPE_WEBHOOK_SECRET, dbClient);

  return new Response(JSON.stringify({ received: true, ...result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...baseHeaders },
  });
}

export function handleResetPasswordRequest(url: URL, baseHeaders: Record<string, string>): Response {
  const token = url.searchParams.get('token') || '';
  const error = url.searchParams.get('error') || '';
  const requestedRedirect = url.searchParams.get('redirect_to');

  if (requestedRedirect && !isValidRedirectUrl(requestedRedirect)) {
    return new Response(JSON.stringify({ error: 'Invalid or unwhitelisted redirect target domain' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...baseHeaders },
    });
  }

  const redirectTo = requestedRedirect && isValidRedirectUrl(requestedRedirect)
    ? requestedRedirect
    : 'moneymatters://reset-password';

  const html = renderPasswordResetHtml(token, error, redirectTo);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...baseHeaders },
  });
}

export async function handleTrpcRequest(
  request: Request,
  env: WorkerEnv,
  correlationId: string,
  baseHeaders: Record<string, string>
): Promise<Response> {
  const response = await fetchRequestHandler({
    endpoint: '/trpc',
    req: request,
    router: appRouter,
    createContext: (opts) => createEdgeContext(opts, env),
    onError: ({ error, path }) => {
      logger.error(`[tRPC Error] path '${path}'`, { correlationId, error });
    },
  });

  const newHeaders = new Headers(response.headers);
  Object.entries(baseHeaders).forEach(([key, val]) => {
    newHeaders.set(key, val);
  });
  newHeaders.set('x-correlation-id', correlationId);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: { waitUntil: (promise: Promise<unknown>) => void }): Promise<Response> {
    const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();
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
    const baseHeaders = {
      ...corsHeaders,
      ...securityHeaders,
      'x-correlation-id': correlationId,
    };

    try {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: baseHeaders,
        });
      }

      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...baseHeaders,
          },
        });
      }

      // Enforce rate limiting across API routes
      const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown-ip";
      const authHeader = request.headers.get("authorization");
      const rateLimitKey = authHeader ? `auth:${authHeader.slice(-16)}` : `ip:${clientIp}`;
      const limit = url.pathname === "/reset-password" ? 10 : url.pathname === "/webhooks/stripe" ? 60 : 120;
      
      const { allowed } = await checkRateLimit(rateLimitKey, limit, 60);
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a minute." }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
            ...baseHeaders,
          },
        });
      }

      if (url.pathname.startsWith('/api/inngest')) {
        const inngestHandler = serve({
          client: inngest,
          functions,
          servePath: '/api/inngest',
          signingKey: env.INNGEST_SIGNING_KEY,
        }) as unknown as (
          req: Request,
          e: Record<string, string | undefined>,
          c?: { waitUntil: (promise: Promise<unknown>) => void }
        ) => Promise<Response>;
        const inngestRes = await inngestHandler(request, env as unknown as Record<string, string | undefined>, ctx);
        const inngestHeaders = new Headers(inngestRes.headers);
        inngestHeaders.set('x-correlation-id', correlationId);
        return new Response(inngestRes.body, {
          status: inngestRes.status,
          statusText: inngestRes.statusText,
          headers: inngestHeaders,
        });
      }

      if (url.pathname === '/webhooks/stripe' && request.method === 'POST') {
        return await handleStripeWebhookRequest(request, env, baseHeaders);
      }

      if (url.pathname === '/reset-password') {
        return handleResetPasswordRequest(url, baseHeaders);
      }

      if (url.pathname.startsWith('/trpc')) {
        return await handleTrpcRequest(request, env, correlationId, baseHeaders);
      }

      return new Response(JSON.stringify({ error: 'Route not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders,
        },
      });
    } catch (err: unknown) {
      logger.error('[WORKER UNCAUGHT ERROR]', { correlationId, err });
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
            ...baseHeaders,
          },
        }
      );
    }
  },
};

