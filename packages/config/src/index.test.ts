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
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
      const config = validateEnv();
      expect(config.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/testdb');
      expect(config.PORT).toBe(4000);
      expect(config.APP_MONEY_MATTERS_ID).toBe('01908bde-34bb-7b19-a178-574211bc93aa');
    });
  });

  describe('resolveAppConfig', () => {
    it('returns AppConfig for registered app ID', () => {
      const app = resolveAppConfig('01908bde-34bb-7b19-a178-574211bc93aa');
      expect(app).not.toBeNull();
      expect(app?.name).toBe('Money Matters');
      expect(app?.features.canAffordCalculator).toBe(true);
    });

    it('returns null for unregistered app ID', () => {
      expect(resolveAppConfig('00000000-0000-0000-0000-000000000000')).toBeNull();
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

    it('exposes FEATURE_FLAGS registry metadata correctly', () => {
      expect(FEATURE_FLAGS.premiumEnabled.owner).toBe('product');
      expect(FEATURE_FLAGS.offlineSync.owner).toBe('engineering');
    });
  });
});
