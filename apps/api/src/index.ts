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

const env = validateEnv();

const server = fastify({ 
  maxParamLength: 5000,
  logger: true,
  disableRequestLogging: true,
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
    ? ["http://localhost:3000", "http://localhost:3001", "http://localhost:8081"]
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
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
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
  }) as any,
  url: "/api/inngest",
});

const start = async () => {
  try {
    const port = env.PORT || 4000;
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`\n🚀 Money Matters API listening on http://localhost:${port} (Health check: http://localhost:${port}/health)\n`);
    server.log.info(`🚀 Server listening on port ${port}`);
  } catch (err) {
    console.error("Failed to start API server:", err);
    process.exit(1);
  }
};

start();
