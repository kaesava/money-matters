import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";

/**
 * Rate limiter plugin for the Fastify API.
 *
 * Uses Upstash Redis in production (distributed, survives restarts and horizontal scale).
 * Falls back to an in-process sliding-window map in development/test environments.
 *
 * Configure via environment variables:
 *   UPSTASH_REDIS_REST_URL  — Upstash Redis REST endpoint
 *   UPSTASH_REDIS_REST_TOKEN — Upstash Redis REST token
 */

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100; // per window per key

// ─── In-process fallback (dev / test only) ───────────────────────────────────
const localStore: Record<string, number[]> = {};

function inProcessCheck(clientKey: string): boolean {
  const now = Date.now();
  if (!localStore[clientKey]) localStore[clientKey] = [];
  localStore[clientKey] = localStore[clientKey].filter((t) => now - t < WINDOW_MS);
  if (localStore[clientKey].length >= MAX_REQUESTS) return false;
  localStore[clientKey].push(now);
  return true;
}

// ─── Upstash Redis check (production) ────────────────────────────────────────
let _redis: UpstashRedis | null = null;

interface UpstashRedis {
  pipeline(): UpstashPipeline;
}

interface UpstashPipeline {
  zadd(key: string, score: number, member: string): void;
  zremrangebyscore(key: string, min: number, max: number): void;
  zcard(key: string): void;
  expire(key: string, seconds: number): void;
  exec(): Promise<Array<unknown>>;
}

function getRedis(): UpstashRedis | null {
  if (_redis) return _redis;
  const url = process.env["UPSTASH_REDIS_REST_URL"];
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
  if (!url || !token) return null;

  // Lazy import to avoid loading Redis in environments where it's not configured
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require("@upstash/redis");
    _redis = new Redis({ url, token }) as UpstashRedis;
    return _redis;
  } catch {
    return null;
  }
}

async function upstashCheck(clientKey: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return inProcessCheck(clientKey);

  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const key = `rl:${clientKey}`;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  pipeline.zcard(key);
  pipeline.expire(key, 60);

  const results = await pipeline.exec();
  // zcard result is at index 2
  const count = results[2] as number;
  return count <= MAX_REQUESTS;
}

// ─── Fastify plugin ───────────────────────────────────────────────────────────
function rateLimiterPlugin(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: () => void
) {
  fastify.addHook("preHandler", async (req, reply) => {
    const clientKey = (req.headers["authorization"] as string | undefined) ?? req.ip;
    const allowed = await upstashCheck(clientKey);
    if (!allowed) {
      reply.code(429).send({ error: "Too many requests. Please try again in a minute." });
    }
  });

  done();
}

export const rateLimiter = fp(rateLimiterPlugin);
