import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, checkAiTenantRateLimit } from './rate-limiter.js';

describe('rate-limiter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses in-process fallback when no Upstash credentials are provided', async () => {
    const res = await checkRateLimit('test-client-1', 5, 60, {});
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(4);
  });

  it('skips Upstash call if token is NA or replace-me placeholder', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await checkRateLimit('test-client-2', 5, 60, {
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'NA',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.allowed).toBe(true);
  });

  it('falls back to in-process limiter if Upstash fetch fails on general endpoints', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('DNS lookup failed'));
    process.env.ENVIRONMENT = 'production';

    const res = await checkRateLimit('ip:127.0.0.1', 10, 60, {
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'valid-token',
    });

    expect(res.allowed).toBe(true);
  });

  it('fails closed for password reset brute force in production if Upstash fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('DNS lookup failed'));
    process.env.ENVIRONMENT = 'production';

    const res = await checkRateLimit('reset-password:127.0.0.1', 10, 60, {
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'valid-token',
    });

    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
  });

  it('checks AI tenant rate limits with in-process fallback', async () => {
    const res = await checkAiTenantRateLimit('tenant-123', 5, {});
    expect(res.allowed).toBe(true);
  });
});
