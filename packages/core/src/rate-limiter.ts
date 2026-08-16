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

export async function checkRateLimit(
  identifier: string,
  limit = 100,
  windowSeconds = 60,
  env?: { UPSTASH_REDIS_REST_URL?: string; UPSTASH_REDIS_REST_TOKEN?: string }
): Promise<{ allowed: boolean; remaining: number }> {
  const restUrl = env?.UPSTASH_REDIS_REST_URL || process.env["UPSTASH_REDIS_REST_URL"];
  const restToken = env?.UPSTASH_REDIS_REST_TOKEN || process.env["UPSTASH_REDIS_REST_TOKEN"];

  if (restUrl && restToken) {
    try {
      const now = Date.now();
      const windowStart = now - windowSeconds * 1000;
      const key = `rl:${identifier}`;

      const res = await fetch(`${restUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${restToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["ZREMRANGEBYSCORE", key, 0, windowStart],
          ["ZADD", key, now, `${now}-${Math.random()}`],
          ["ZCARD", key],
          ["EXPIRE", key, windowSeconds],
        ]),
      });

      if (res.ok) {
        const data = (await res.json()) as Array<{ result: number }>;
        const count = data[2]?.result ?? 0;
        return {
          allowed: count <= limit,
          remaining: Math.max(0, limit - count),
        };
      }
    } catch {
      // Fallback to in-process check if Redis HTTP request fails
    }
  }

  // Fallback in-process check
  const now = Date.now();
  if (!localStore[identifier]) localStore[identifier] = [];
  localStore[identifier] = localStore[identifier].filter((t) => now - t < windowSeconds * 1000);
  
  if (localStore[identifier].length >= limit) {
    return { allowed: false, remaining: 0 };
  }
  localStore[identifier].push(now);
  return { allowed: true, remaining: limit - localStore[identifier].length };
}

// ─── Fastify plugin ───────────────────────────────────────────────────────────
function rateLimiterPlugin(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: () => void
) {
  fastify.addHook("preHandler", async (req, reply) => {
    const clientKey = (req.headers["authorization"] as string | undefined) ?? req.ip;
    const { allowed } = await checkRateLimit(clientKey, MAX_REQUESTS, 60);
    if (!allowed) {
      reply.code(429).send({ error: "Too many requests. Please try again in a minute." });
    }
  });

  done();
}

export const rateLimiter = fp(rateLimiterPlugin);
