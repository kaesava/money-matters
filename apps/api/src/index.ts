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

server.get('/reset-password', async (request, reply) => {
  const query = request.query as Record<string, string>;
  const token = query['token'] || '';
  const error = query['error'] || '';
  const redirectTo = query['redirect_to'] || 'moneymatters://reset-password';
  
  reply.type('text/html').send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Redirecting...</title>
        <script>
          const token = ${JSON.stringify(token)};
          const error = ${JSON.stringify(error)};
          const baseRedirect = ${JSON.stringify(redirectTo)};
          
          let targetUrl = baseRedirect;
          if (targetUrl.includes('?')) {
            if (error) targetUrl += '&error=' + encodeURIComponent(error);
            if (token) targetUrl += '&token=' + encodeURIComponent(token);
          } else {
            if (error) {
              targetUrl += '?error=' + encodeURIComponent(error);
            } else if (token) {
              targetUrl += '?token=' + encodeURIComponent(token);
            }
          }
          window.location.href = targetUrl;
        </script>
      </head>
      <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
        <h2>Redirecting to Money Matters...</h2>
        <p>If you are not redirected automatically, <a href="#" id="manualLink">click here</a>.</p>
        <script>
          document.getElementById('manualLink').href = targetUrl;
        </script>
      </body>
    </html>
  `);
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
