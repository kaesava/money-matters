import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './routers/_app.js';
import { createContext } from './trpc/context.js';
import { inngest } from "./inngest/client.js";
import { functions } from "./inngest/index.js";
import { serve } from "inngest/fastify";
import { validateEnv } from '@money-matters/config';
import { correlationIdHook, rateLimiter } from '@money-matters/core';
import * as Sentry from "@sentry/node";
import { posthog } from './lib/posthog.js';

const env = validateEnv();

const isDev = process.env.NODE_ENV !== "production";

const server = fastify({ 
  maxParamLength: 5000,
  logger: true,
  disableRequestLogging: !isDev,
  trustProxy: true,
});

server.addHook("onRequest", correlationIdHook);
server.register(rateLimiter);

server.register(helmet, {
  contentSecurityPolicy: false,
});

const ALLOWED_ORIGINS = [
  "https://moneymatters.kaesava.au",
  "https://www.moneymatters.kaesava.au",
  "https://api.moneymatters.kaesava.au",
  "https://kaesava.au",
  "https://www.kaesava.au",
  ...(process.env["NODE_ENV"] !== "production"
    ? [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8081",
        "https://kesh-imac.tail09ef18.ts.net",
      ]
    : []),
];

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "production",
    tracesSampleRate: 0.1,
  });
}

server.register(cors, {
  origin: (origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) => {
    const isLocalDevOrigin = !isDev
      ? false
      : typeof origin === "string" && (
          /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.0\.2\.2)(:\d+)?$/.test(origin) ||
          /^https:\/\/[a-z0-9-]+\.tail09ef18\.ts\.net$/.test(origin)
        );

    if (!origin || ALLOWED_ORIGINS.includes(origin) || isLocalDevOrigin) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`), false);
    }
  },
  credentials: true,
});

server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Dev Callback Relay for Neon Auth redirects (bridges Tailscale Funnel on 3001 to Next.js on 3000 or mobile deep links)
server.get('/dev-callback/*', async (req, reply) => {
  const fullUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3001'}`);
  const wildcard = (req.params as { '*': string })['*'] || '';
  
  server.log.info({ wildcard, search: fullUrl.search }, '[Dev Callback Relay] Processing callback');

  // Case 1: Mobile scheme callback, e.g. /dev-callback/moneymatters/reset-password or /dev-callback/moneymatters/auth-callback
  if (wildcard.startsWith('moneymatters/') || wildcard.startsWith('exp/')) {
    const scheme = wildcard.startsWith('exp/') ? 'exp://' : 'moneymatters://';
    const subPath = wildcard.replace(/^(moneymatters|exp)\//, '');
    
    // Check if redirect_to was passed in query
    const requestedRedirect = fullUrl.searchParams.get('redirect_to');
    let targetBase = requestedRedirect || `${scheme}${subPath}`;

    const targetUrl = new URL(targetBase);
    fullUrl.searchParams.forEach((val, key) => {
      if (key !== 'redirect_to') {
        targetUrl.searchParams.set(key, val);
      }
    });

    server.log.info({ target: targetUrl.toString() }, '[Dev Callback Relay] Redirecting to mobile scheme');
    return reply.redirect(targetUrl.toString(), 302);
  }

  // Case 2: Web proxy callback, e.g. /dev-callback/http/localhost:3000 or /dev-callback/https/moneymatters.kaesava.au
  const segments = wildcard.split('/');
  if (segments.length >= 2) {
    const proto = decodeURIComponent(segments[0]);
    const hostAndPath = decodeURIComponent(segments.slice(1).join('/'));
    const customTarget = fullUrl.searchParams.get('target') || '/auth-callback';
    
    try {
      const targetBase = `${proto}://${hostAndPath}`;
      const targetUrl = new URL(customTarget, targetBase);

      fullUrl.searchParams.forEach((val, key) => {
        if (key !== 'target') {
          targetUrl.searchParams.set(key, val);
        }
      });

      server.log.info({ target: targetUrl.toString() }, '[Dev Callback Relay] Redirecting to web target');
      return reply.redirect(targetUrl.toString(), 302);
    } catch (e) {
      server.log.error({ err: e }, '[Dev Callback Relay] Failed to build redirect URL');
    }
  }

  // Fallback default
  return reply.redirect('http://localhost:3000/dashboard', 302);
});

server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
});

server.route({
  method: ["GET", "POST", "PUT"],
  handler: serve({
    client: inngest,
    functions,
    signingKey: process.env.INNGEST_SIGNING_KEY,
  }) as unknown as Parameters<typeof server.route>[0]['handler'],
  url: "/api/inngest",
});

server.setErrorHandler(async (err, _req, reply) => {
  if (posthog) {
    posthog.captureException(err);
  }
  reply.send(err);
});

const start = async () => {
  try {
    const port = env.PORT || 3001;
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`\n🚀 Money Matters API listening on http://localhost:${port} (Health check: http://localhost:${port}/health)\n`);
    server.log.info(`🚀 Server listening on port ${port}`);
  } catch (err) {
    console.error("Failed to start API server:", err);
    process.exit(1);
  }
};

const shutdown = async () => {
  if (posthog) {
    await posthog.shutdown();
  }
  await server.close();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
