import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";

const mockMemoryStore: Record<string, number[]> = {};

function rateLimiterPlugin(fastify: FastifyInstance, opts: FastifyPluginOptions, done: () => void) {
  fastify.addHook("preHandler", (req, reply, next) => {
    // Rely on authenticated user credentials or client IP address for limits
    const clientKey = req.headers.authorization || req.ip;
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequests = 100; // max 100 requests per minute

    if (!mockMemoryStore[clientKey]) {
      mockMemoryStore[clientKey] = [];
    }

    // Filter old logs
    mockMemoryStore[clientKey] = mockMemoryStore[clientKey].filter(timestamp => now - timestamp < windowMs);

    if (mockMemoryStore[clientKey].length >= maxRequests) {
      reply.code(429).send({ error: "Too many requests. Scoped rate limit exceeded." });
      return;
    }

    mockMemoryStore[clientKey].push(now);
    next();
  });

  done();
}

export const rateLimiter = fp(rateLimiterPlugin);
