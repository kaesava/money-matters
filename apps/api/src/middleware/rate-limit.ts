import { checkRateLimit } from '@money-matters/core';

async function hashKey(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export async function enforceApiRateLimit(
  request: Request,
  url: URL,
  baseHeaders: Record<string, string>,
  env?: { UPSTASH_REDIS_REST_URL?: string; UPSTASH_REDIS_REST_TOKEN?: string }
): Promise<Response | null> {
  // Exempt cryptographic Stripe webhooks from general rate limiting
  if (url.pathname === '/webhooks/stripe') {
    return null;
  }

  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown-ip';

  const isResetPassword = url.pathname === '/reset-password';
  const authHeader = request.headers.get('authorization');
  let rateLimitKey = isResetPassword ? `reset-password:${clientIp}` : `ip:${clientIp}`;

  if (authHeader && !isResetPassword) {
    const hashed = await hashKey(authHeader);
    // Use `api:` rather than `auth:` so general authenticated API traffic falls back to
    // the in-process limiter on Redis outage instead of failing closed like auth brute-force routes.
    rateLimitKey = `api:${hashed}`;
  }

  const limit = isResetPassword ? 10 : 120;
  const { allowed } = await checkRateLimit(rateLimitKey, limit, 60, env);

  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again in a minute.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
        ...baseHeaders,
      },
    });
  }

  return null;
}
