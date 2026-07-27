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
import { logger, correlationIdHook, rateLimiter } from '@money-matters/core';

const env = validateEnv();

const server = fastify({ 
  maxParamLength: 5000,
  logger: logger,
  disableRequestLogging: true,
  trustProxy: true, // Required for Cloudflare proxy terminating SSL
});

server.addHook("onRequest", correlationIdHook);
server.register(rateLimiter);

server.register(helmet, {
  contentSecurityPolicy: false,
});

// Explicitly allow your custom domains
const ALLOWED_ORIGINS = [
  "https://moneymatters.kaesava.au",
  "https://www.moneymatters.kaesava.au",
  "https://api.moneymatters.kaesava.au",
  // Legacy domains maintained for safety during migration
  "https://kaesava.au",
  "https://www.kaesava.au",
  ...(process.env["NODE_ENV"] !== "production"
    ? ["http://localhost:3000", "http://localhost:3001", "http://localhost:8081"]
    : []),
];

server.register(cors, {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`), false);
    }
  },
  credentials: true,
});

server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
});

server.route({
  method: ["GET", "POST", "PUT"],
  handler: serve({ client: inngest, functions }),
  url: "/api/inngest",
});

const start = async () => {
  try {
    const port = env.PORT;
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`🚀 Server listening on port ${port}`);
  } catch (err) {
    process.exit(1);
  }
};

start();
