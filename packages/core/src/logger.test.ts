import { describe, it, expect, vi } from 'vitest';
import { logger, redactPii, formatLog } from './logger.js';

describe('Core Logger', () => {
  it('instantiates logger with uppercase level formatter', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  describe('redactPii', () => {
    it('returns primitive values and null/undefined unchanged', () => {
      expect(redactPii(null)).toBeNull();
      expect(redactPii(undefined)).toBeUndefined();
      expect(redactPii(123)).toBe(123);
      expect(redactPii('hello')).toBe('hello');
      expect(redactPii(true)).toBe(true);
    });

    it('redacts sensitive PII fields in shallow objects', () => {
      const input = {
        email: 'user@example.com',
        password: 'secretpassword',
        token: 'ey12345',
        jwt: 'header.payload.sig',
        authorization: 'Bearer token',
        displayName: 'John Doe',
        inviteEmail: 'invite@test.com',
        avatarUrl: 'https://img.png',
        note: 'private notes',
        expoPushToken: 'ExponentPushToken[123]',
        safeId: 'uuid-123',
        amount: 500,
      };

      const result = redactPii(input) as Record<string, unknown>;
      expect(result.email).toBe('[REDACTED_PII]');
      expect(result.password).toBe('[REDACTED_PII]');
      expect(result.token).toBe('[REDACTED_PII]');
      expect(result.jwt).toBe('[REDACTED_PII]');
      expect(result.authorization).toBe('[REDACTED_PII]');
      expect(result.displayName).toBe('[REDACTED_PII]');
      expect(result.inviteEmail).toBe('[REDACTED_PII]');
      expect(result.avatarUrl).toBe('[REDACTED_PII]');
      expect(result.note).toBe('[REDACTED_PII]');
      expect(result.expoPushToken).toBe('[REDACTED_PII]');
      expect(result.safeId).toBe('uuid-123');
      expect(result.amount).toBe(500);
    });

    it('recursively redacts PII in nested objects and arrays', () => {
      const input = {
        tenantId: 'tenant-1',
        members: [
          { email: 'member1@test.com', role: 'MEMBER' },
          { email: 'member2@test.com', role: 'VIEWER' },
        ],
        meta: {
          auth: {
            token: 'secret-token',
            type: 'Bearer',
          },
        },
      };

      const result = redactPii(input) as {
        tenantId: string;
        members: { email: string; role: string }[];
        meta: { auth: { token: string; type: string } };
      };

      expect(result.tenantId).toBe('tenant-1');
      expect(result.members[0].email).toBe('[REDACTED_PII]');
      expect(result.members[0].role).toBe('MEMBER');
      expect(result.members[1].email).toBe('[REDACTED_PII]');
      expect(result.meta.auth.token).toBe('[REDACTED_PII]');
      expect(result.meta.auth.type).toBe('Bearer');
    });

    it('safely handles Error objects with stack preservation and PII redaction', () => {
      const err = new Error('Database query failed');
      (err as unknown as Record<string, unknown>).email = 'sensitive@err.com';

      const result = redactPii(err) as Record<string, unknown>;
      expect(result.name).toBe('Error');
      expect(result.message).toBe('Database query failed');
      expect(result.stack).toBeDefined();
      expect(result.email).toBe('[REDACTED_PII]');
    });
  });

  describe('formatLog and logger output', () => {
    it('formats log with timestamp, level, message, and safe JSON metadata', () => {
      const formatted = formatLog('info', 'User logged in', { userId: 'u-1', email: 'test@kaesava.au' });
      expect(formatted).toContain('[INFO] User logged in');
      expect(formatted).toContain('"userId":"u-1"');
      expect(formatted).toContain('"email":"[REDACTED_PII]"');
      expect(formatted).not.toContain('test@kaesava.au');
    });

    it('invokes console methods when called', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      logger.info('Test info message', { safeKey: 'val' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

