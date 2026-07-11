import fastify from 'fastify';
import cors from '@fastify/cors';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './routers/_app.js';
import { createContext } from './trpc/context.js';
import { inngest } from "./inngest/client.js";
import { functions } from "./inngest/index.js";
import { serve } from "inngest/fastify";
import { validateEnv } from '@money-matters/config';
import { logger, correlationIdHook, rateLimiter } from '@money-matters/core';

// Validate env vars first to fail fast if config targets are invalid/missing
const env = validateEnv();

const server = fastify({ 
  maxParamLength: 5000,
  logger: logger 
});

// Configure correlation ID tracking and rate limiting limits securely
server.addHook("onRequest", correlationIdHook);
server.register(rateLimiter);

server.register(cors, { origin: true, credentials: true });

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
