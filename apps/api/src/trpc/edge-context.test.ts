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

  describe('resolveTenantMembership', () => {
    it('selects the first membership (OWNER prioritized) when no tenant header is requested', async () => {
      const { resolveTenantMembership } = await import('./edge-context.js');
      const memberships = [
        { tenantId: 'tenant-owner-1', role: 'OWNER', appId: '01908bde-34bb-7b19-a178-574211bc93aa' },
        { tenantId: 'tenant-member-2', role: 'MEMBER', appId: '01908bde-34bb-7b19-a178-574211bc93aa' },
      ];

      const mockDb = {
        insert: () => ({
          values: () => ({
            onConflictDoUpdate: () => Promise.resolve(),
          }),
        }),
        select: () => ({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                orderBy: () => Promise.resolve(memberships),
              }),
            }),
          }),
        }),
      } as unknown as Parameters<typeof resolveTenantMembership>[0];

      const result = await resolveTenantMembership(
        mockDb,
        { userId: 'user-1', email: 'test@example.com' },
        null,
        'test-corr-id'
      );

      expect(result.tenantId).toBe('tenant-owner-1');
      expect(result.role).toBe('OWNER');
    });

    it('selects requested tenant when requestedTenantId matches a valid membership', async () => {
      const { resolveTenantMembership } = await import('./edge-context.js');
      const memberships = [
        { tenantId: 'tenant-owner-1', role: 'OWNER', appId: '01908bde-34bb-7b19-a178-574211bc93aa' },
        { tenantId: 'tenant-member-2', role: 'MEMBER', appId: '01908bde-34bb-7b19-a178-574211bc93aa' },
      ];

      const mockDb = {
        insert: () => ({
          values: () => ({
            onConflictDoUpdate: () => Promise.resolve(),
          }),
        }),
        select: () => ({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                orderBy: () => Promise.resolve(memberships),
              }),
            }),
          }),
        }),
      } as unknown as Parameters<typeof resolveTenantMembership>[0];

      const result = await resolveTenantMembership(
        mockDb,
        { userId: 'user-1', email: 'test@example.com' },
        'tenant-member-2',
        'test-corr-id'
      );

      expect(result.tenantId).toBe('tenant-member-2');
      expect(result.role).toBe('MEMBER');
    });
  });
});
