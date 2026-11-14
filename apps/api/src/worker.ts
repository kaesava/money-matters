import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { logger, CANONICAL_SECURITY_HEADERS } from '@money-matters/core';
import { validateEnv } from '@money-matters/config';
import { appRouter } from './routers/_app.js';
import { createEdgeContext } from './trpc/edge-context.js';
import { inngest, syncInngestEventKey } from './inngest/client.js';
import { functions } from './inngest/index.js';
import { serve } from 'inngest/cloudflare';
import { buildCorsHeaders } from './middleware/cors.js';
import { enforceApiRateLimit } from './middleware/rate-limit.js';
import { handleResetPasswordRequest, isValidRedirectUrl } from './routes/password-reset.js';
import { handleStripeWebhookRequest } from './routes/stripe-webhook.js';
import { handleDevCallbackRequest } from './routes/dev-callback.js';

export { isValidRedirectUrl };

export interface WorkerEnv {
  ENVIRONMENT?: string;
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
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  CF_AI_GATEWAY_ID?: string;
  CF_AI_API_TOKEN?: string;
  AI_MODEL_ID?: string;
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

let isWorkerEnvInitialized = false;

export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    ctx: { waitUntil: (promise: Promise<unknown>) => void }
  ): Promise<Response> {
    const url = new URL(request.url);
    const isLocalHost =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '0.0.0.0' ||
      url.hostname.startsWith('192.168.') ||
      url.hostname.startsWith('100.');
    const isDev =
      env.ENVIRONMENT === 'development' ||
      process.env.NODE_ENV === 'development' ||
      isLocalHost;

    if (!isWorkerEnvInitialized && env && typeof env === 'object') {
      Object.assign(process.env, env);
      syncInngestEventKey(env.INNGEST_EVENT_KEY);
      if (isDev) {
        process.env.ENVIRONMENT = 'development';
      }
      try {
        validateEnv(env as unknown as Record<string, unknown>);
        isWorkerEnvInitialized = true;
      } catch (err) {
        logger.error('Worker environment initialization failed', { err });
      }
    }

    const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();
    const requestOrigin = request.headers.get('Origin');
    const corsHeaders = buildCorsHeaders(requestOrigin, isDev);
    const baseHeaders: Record<string, string> = {
      ...corsHeaders,
      ...CANONICAL_SECURITY_HEADERS,
      'x-correlation-id': correlationId,
    };

    try {
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

      const rateLimitResponse = await enforceApiRateLimit(request, url, baseHeaders, env);
      if (rateLimitResponse) {
        return rateLimitResponse;
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

      if (url.pathname.startsWith('/dev-callback')) {
        return handleDevCallbackRequest(url, isDev, baseHeaders);
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
      const rawMessage = err instanceof Error ? err.message : 'Internal Server Error';
      const isInternalOrDbError =
        /violates.*constraint|foreign key|syntax error|relation.*does not exist|table ".*"|column ".*"/i.test(rawMessage);
      const safeMessage = (!isDev && isInternalOrDbError)
        ? 'Internal Server Error. Please contact info@moneymatters.kaesava.au with your correlation ID.'
        : rawMessage;

      return new Response(
        JSON.stringify({
          error: {
            message: safeMessage,
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
