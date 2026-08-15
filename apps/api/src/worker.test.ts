import { describe, it, expect } from 'vitest';
import worker, { isValidRedirectUrl, WorkerEnv } from './worker.js';

describe('API Worker Security - isValidRedirectUrl', () => {
  it('allows mobile application deep link scheme moneymatters://', () => {
    expect(isValidRedirectUrl('moneymatters://reset-password')).toBe(true);
    expect(isValidRedirectUrl('moneymatters://auth/callback')).toBe(true);
  });

  it('allows valid kaesava.au domains and subdomains', () => {
    expect(isValidRedirectUrl('https://kaesava.au/reset-password')).toBe(true);
    expect(isValidRedirectUrl('https://moneymatters.kaesava.au/reset-password')).toBe(true);
    expect(isValidRedirectUrl('https://api.moneymatters.kaesava.au')).toBe(true);
  });

  it('allows localhost and 127.0.0.1 for development', () => {
    expect(isValidRedirectUrl('http://localhost:3000/reset-password')).toBe(true);
    expect(isValidRedirectUrl('http://127.0.0.1:8787')).toBe(true);
  });

  it('blocks open redirect attempts to unwhitelisted external domains', () => {
    expect(isValidRedirectUrl('https://evil.com/reset-password')).toBe(false);
    expect(isValidRedirectUrl('https://phishing-kaesava.au.evil.com')).toBe(false);
    expect(isValidRedirectUrl('javascript:alert(1)')).toBe(false);
    expect(isValidRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isValidRedirectUrl('')).toBe(false);
  });
});

describe('API Worker - Correlation ID and Endpoints', () => {
  const mockEnv: WorkerEnv = {
    MONEY_MATTERS_APP_ID: '01908bde-34bb-7b19-a178-574211bc93aa',
    STORAGE_BUCKET_NAME: 'test',
    STORAGE_ENDPOINT: 'http://localhost',
    STORAGE_REGION: 'auto',
    GLOBAL_MAX_FILE_SIZE_MB: '10',
    NEXT_PUBLIC_NEON_AUTH_URL: 'http://localhost/auth',
    NEON_AUTH_BASE_URL: 'http://localhost/auth',
    NEON_AUTH_JWKS_URL: 'http://localhost/auth/jwks',
  };

  const mockCtx = {
    waitUntil: (_promise: Promise<unknown>) => {},
  };

  it('preserves incoming x-correlation-id in health check response', async () => {
    const req = new Request('https://api.moneymatters.kaesava.au/health', {
      headers: {
        'x-correlation-id': 'custom-req-id-12345',
      },
    });

    const res = await worker.fetch(req, mockEnv, mockCtx);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-correlation-id')).toBe('custom-req-id-12345');
  });

  it('generates a new x-correlation-id when none provided', async () => {
    const req = new Request('https://api.moneymatters.kaesava.au/health');
    const res = await worker.fetch(req, mockEnv, mockCtx);
    expect(res.status).toBe(200);
    const correlationId = res.headers.get('x-correlation-id');
    expect(correlationId).toBeDefined();
    expect(typeof correlationId).toBe('string');
    expect(correlationId?.length).toBeGreaterThan(0);
  });

  it('includes x-correlation-id on 404 responses', async () => {
    const req = new Request('https://api.moneymatters.kaesava.au/unknown-path', {
      headers: {
        'x-correlation-id': 'test-404-id',
      },
    });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    expect(res.status).toBe(404);
    expect(res.headers.get('x-correlation-id')).toBe('test-404-id');
  });

  it('includes x-correlation-id on CORS OPTIONS preflight', async () => {
    const req = new Request('https://api.moneymatters.kaesava.au/trpc/getMonthlySummary', {
      method: 'OPTIONS',
      headers: {
        'x-correlation-id': 'cors-test-id',
      },
    });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    expect(res.status).toBe(204);
    expect(res.headers.get('x-correlation-id')).toBe('cors-test-id');
  });
});

