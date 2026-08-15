import { describe, it, expect } from 'vitest';
import { extractCorrelationId, extractAuthToken } from './edge-context.js';

describe('Edge Context Unit Tests', () => {
  describe('extractCorrelationId', () => {
    it('returns x-correlation-id header when present on request and sets it on resHeaders', () => {
      const headers = new Headers();
      headers.set('x-correlation-id', 'test-edge-corr-id-99');
      const req = new Request('https://api.moneymatters.kaesava.au/trpc', { headers });
      const resHeaders = new Headers();

      const id = extractCorrelationId(req, resHeaders);
      expect(id).toBe('test-edge-corr-id-99');
      expect(resHeaders.get('x-correlation-id')).toBe('test-edge-corr-id-99');
    });

    it('generates a UUID when no correlation ID header is present and sets it on resHeaders', () => {
      const req = new Request('https://api.moneymatters.kaesava.au/trpc');
      const resHeaders = new Headers();

      const id = extractCorrelationId(req, resHeaders);
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(resHeaders.get('x-correlation-id')).toBe(id);
    });
  });

  describe('extractAuthToken', () => {
    it('extracts bearer token from authorization header', () => {
      const headers = new Headers();
      headers.set('authorization', 'Bearer my-jwt-token-value');
      const req = new Request('https://api.moneymatters.kaesava.au/trpc', { headers });

      const token = extractAuthToken(req);
      expect(token).toBe('my-jwt-token-value');
    });

    it('extracts neon-auth session token from cookie header if no auth header', () => {
      const headers = new Headers();
      headers.set('cookie', '__Secure-neon-auth.session_token=cookie-token-abc; path=/');
      const req = new Request('https://api.moneymatters.kaesava.au/trpc', { headers });

      const token = extractAuthToken(req);
      expect(token).toBe('cookie-token-abc');
    });

    it('returns empty string if neither auth header nor cookie present', () => {
      const req = new Request('https://api.moneymatters.kaesava.au/trpc');
      const token = extractAuthToken(req);
      expect(token).toBe('');
    });
  });
});
