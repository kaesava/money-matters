import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { enforceApiRateLimit } from './rate-limit.js';

describe('enforceApiRateLimit', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ENVIRONMENT: 'production' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('allows authenticated general tRPC requests in production when Upstash is not configured', async () => {
    const req = new Request('https://api.moneymatters.kaesava.au/trpc/listEnvelopes,listUserTenants?batch=1', {
      headers: {
        authorization: 'Bearer test-token-123',
        'cf-connecting-ip': '203.0.113.10',
      },
    });
    const res = await enforceApiRateLimit(req, new URL(req.url), { 'Access-Control-Allow-Origin': '*' }, {});
    expect(res).toBeNull();
  });

  it('fails closed on /reset-password in production when Upstash is not configured', async () => {
    const req = new Request('https://api.moneymatters.kaesava.au/reset-password', {
      method: 'POST',
      headers: {
        'cf-connecting-ip': '203.0.113.11',
      },
    });
    const res = await enforceApiRateLimit(req, new URL(req.url), {}, {});
    expect(res).not.toBeNull();
    expect(res?.status).toBe(429);
  });
});
