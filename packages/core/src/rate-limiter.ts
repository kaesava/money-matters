/**
 * Sliding window rate limiter powered by Upstash Redis (REST pipeline).
 * Falls back to an in-process sliding-window cache in local development/test.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 100;

// ─── In-process fallback (dev / test only) ───────────────────────────────────
const localStore: Record<string, number[]> = {};

function inProcessCheck(clientKey: string, limit: number, windowSeconds: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  if (!localStore[clientKey]) localStore[clientKey] = [];
  localStore[clientKey] = localStore[clientKey].filter((t) => now - t < windowMs);

  if (localStore[clientKey].length >= limit) {
    return { allowed: false, remaining: 0 };
  }
  localStore[clientKey].push(now);
  return { allowed: true, remaining: limit - localStore[clientKey].length };
}

function isValidUpstashConfig(url?: string, token?: string): boolean {
  if (!url || !token) return false;
  const trimmedToken = token.trim();
  if (trimmedToken === "" || trimmedToken === "NA" || trimmedToken === "replace-me") {
    return false;
  }
  return true;
}

function isProductionEnv(): boolean {
  return (
    process.env.ENVIRONMENT === "production" ||
    process.env.NODE_ENV === "production"
  );
}

function isSensitiveAuthIdentifier(identifier: string): boolean {
  return (
    identifier.startsWith("auth:") ||
    identifier.startsWith("reset-password:") ||
    identifier.startsWith("invite:")
  );
}

/**
 * Executes a sliding-window rate limit check using Upstash Redis REST pipeline.
 * Protects edge calls with a 1,500ms AbortController timeout.
 */
export async function checkRateLimit(
  identifier: string,
  limit = MAX_REQUESTS,
  windowSeconds = 60,
  env?: { UPSTASH_REDIS_REST_URL?: string; UPSTASH_REDIS_REST_TOKEN?: string }
): Promise<{ allowed: boolean; remaining: number }> {
  const restUrl = env?.UPSTASH_REDIS_REST_URL || process.env["UPSTASH_REDIS_REST_URL"];
  const restToken = env?.UPSTASH_REDIS_REST_TOKEN || process.env["UPSTASH_REDIS_REST_TOKEN"];

  if (!isValidUpstashConfig(restUrl, restToken)) {
    if (isProductionEnv() && isSensitiveAuthIdentifier(identifier)) {
      return { allowed: false, remaining: 0 };
    }
    return inProcessCheck(identifier, limit, windowSeconds);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const key = `rl:${identifier}`;
    const member = `${now}-${crypto.randomUUID()}`;

    const res = await fetch(`${restUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${restToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["ZREMRANGEBYSCORE", key, 0, windowStart],
        ["ZADD", key, now, member],
        ["ZCARD", key],
        ["EXPIRE", key, windowSeconds],
      ]),
      signal: controller.signal,
    });

    if (res.ok) {
      const data = (await res.json()) as Array<{ result: number }>;
      const count = data[2]?.result ?? 0;
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
      };
    }
    if (isProductionEnv() && isSensitiveAuthIdentifier(identifier)) {
      return { allowed: false, remaining: 0 };
    }
  } catch {
    // In production, sensitive auth brute-force endpoints fail closed on Redis outage.
    // General API routes fall back to the in-process sliding-window cache so a Redis outage does not take down the platform.
    if (isProductionEnv() && isSensitiveAuthIdentifier(identifier)) {
      return { allowed: false, remaining: 0 };
    }
  } finally {
    clearTimeout(timeoutId);
  }

  // Fallback in-process check for dev/test or when Redis is unreachable for non-auth routes
  return inProcessCheck(identifier, limit, windowSeconds);
}

/**
 * Checks sliding-window burst limits specifically for AI Assistant requests.
 * Always tenant-scoped, fails closed in strict mode if Redis is configured but unreachable.
 */
export async function checkAiTenantRateLimit(
  tenantId: string,
  limitPerMinute = 10,
  env?: { UPSTASH_REDIS_REST_URL?: string; UPSTASH_REDIS_REST_TOKEN?: string }
): Promise<{ allowed: boolean; remaining: number }> {
  const restUrl = env?.UPSTASH_REDIS_REST_URL || process.env["UPSTASH_REDIS_REST_URL"];
  const restToken = env?.UPSTASH_REDIS_REST_TOKEN || process.env["UPSTASH_REDIS_REST_TOKEN"];

  if (!isValidUpstashConfig(restUrl, restToken)) {
    if (isProductionEnv()) {
      return { allowed: false, remaining: 0 };
    }
    return checkRateLimit(`ai:tenant:${tenantId}`, limitPerMinute, 60);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const now = Date.now();
    const windowStart = now - 60_000;
    const key = `ai:rl:tenant:${tenantId}`;
    const uniqueMember = `${now}-${crypto.randomUUID()}`;

    const res = await fetch(`${restUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${restToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["ZREMRANGEBYSCORE", key, 0, windowStart],
        ["ZADD", key, now, uniqueMember],
        ["ZCARD", key],
        ["EXPIRE", key, 60],
      ]),
      signal: controller.signal,
    });

    if (res.ok) {
      const data = (await res.json()) as Array<{ result: number }>;
      const count = data[2]?.result ?? 0;
      return {
        allowed: count <= limitPerMinute,
        remaining: Math.max(0, limitPerMinute - count),
      };
    }
    return { allowed: false, remaining: 0 };
  } catch {
    if (isProductionEnv()) {
      return { allowed: false, remaining: 0 };
    }
  } finally {
    clearTimeout(timeoutId);
  }

  // Local/dev fallback
  return checkRateLimit(`ai:tenant:${tenantId}`, limitPerMinute, 60);
}

