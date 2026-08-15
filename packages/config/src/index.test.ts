import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv } from './env.js';
import { resolveAppConfig } from './app-registry.js';
import { isFeatureEnabled, FEATURE_FLAGS } from './feature-flags.js';

describe('Config Package Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnv', () => {
    it('validates environment variables when DATABASE_URL is set', () => {
      const config = validateEnv({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/testdb',
        NODE_ENV: 'development',
      });
      expect(config.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/testdb');
      expect(config.PORT).toBe(3001);
      expect(config.APP_MONEY_MATTERS_ID).toBe('01908bde-34bb-7b19-a178-574211bc93aa');
    });

    it('fails in production if DATABASE_URL is missing', () => {
      expect(() => {
        validateEnv({
          NODE_ENV: 'production',
          NEON_AUTH_BASE_URL: 'https://auth.example.com',
          INNGEST_SIGNING_KEY: 'prod-signing-key',
          INNGEST_EVENT_KEY: 'prod-event-key',
        });
      }).toThrow('System Environment Failure');
    });

    it('fails in production if NEON_AUTH_JWKS_URL and NEON_AUTH_BASE_URL are missing', () => {
      expect(() => {
        validateEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgres://user:pass@localhost:5432/testdb',
          INNGEST_SIGNING_KEY: 'prod-signing-key',
          INNGEST_EVENT_KEY: 'prod-event-key',
        });
      }).toThrow('System Environment Failure');
    });

    it('fails in production if default mock Inngest keys are used', () => {
      expect(() => {
        validateEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgres://user:pass@localhost:5432/testdb',
          NEON_AUTH_BASE_URL: 'https://auth.example.com',
          INNGEST_SIGNING_KEY: 'mock-inngest-key',
        });
      }).toThrow('System Environment Failure');
    });

    it('succeeds in production when all critical secrets are provided', () => {
      const config = validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/proddb',
        NEON_AUTH_JWKS_URL: 'https://auth.example.com/jwks.json',
        INNGEST_SIGNING_KEY: 'sign-key-live-12345',
        INNGEST_EVENT_KEY: 'event-key-live-12345',
      });
      expect(config.NODE_ENV).toBe('production');
      expect(config.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/proddb');
    });
  });



  describe('isFeatureEnabled', () => {
    const validAppId = '01908bde-34bb-7b19-a178-574211bc93aa';
    const invalidAppId = '00000000-0000-0000-0000-000000000000';

    it('returns false if app ID is not registered', () => {
      expect(isFeatureEnabled('premiumEnabled', invalidAppId)).toBe(false);
      expect(isFeatureEnabled('partnerInvite', invalidAppId)).toBe(false);
    });

    it('evaluates premiumEnabled flag without and with premium override', () => {
      expect(isFeatureEnabled('premiumEnabled', validAppId, false)).toBe(false);
      expect(isFeatureEnabled('premiumEnabled', validAppId, true)).toBe(true);
    });

    it('evaluates standard feature flags from app configuration', () => {
      expect(isFeatureEnabled('partnerInvite', validAppId)).toBe(false);
      expect(isFeatureEnabled('offlineSync', validAppId)).toBe(false);
    });

    it('exposes FEATURE_FLAGS registry metadata correctly including killSwitchEnabled', () => {
      expect(FEATURE_FLAGS.premiumEnabled.owner).toBe('product');
      expect(FEATURE_FLAGS.offlineSync.owner).toBe('engineering');
      expect(FEATURE_FLAGS.premiumEnabled.killSwitchEnabled).toBe(false);
      expect(FEATURE_FLAGS.partnerInvite.killSwitchEnabled).toBe(false);
    });
  });
});
