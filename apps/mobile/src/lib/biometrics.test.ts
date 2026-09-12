import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSecureStore: Record<string, string> = {};

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => mockSecureStore[key] || null),
  setItemAsync: vi.fn(async (key: string, val: string) => {
    mockSecureStore[key] = val;
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    delete mockSecureStore[key];
  }),
}));

vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: vi.fn(async () => true),
  isEnrolledAsync: vi.fn(async () => true),
  supportedAuthenticationTypesAsync: vi.fn(async () => [1]), // FINGERPRINT
  authenticateAsync: vi.fn(async () => ({ success: true })),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

import {
  checkBiometricsAvailable,
  getBiometricTypeLabel,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  authenticateWithBiometrics,
  recordBackgroundTimestamp,
  shouldPromptBiometricLock,
  markSessionUnlocked,
  resetBiometricSession,
} from './biometrics';

describe('biometrics utilities', () => {
  beforeEach(() => {
    resetBiometricSession();
    for (const key of Object.keys(mockSecureStore)) {
      delete mockSecureStore[key];
    }
  });

  it('detects available biometric hardware and enrollment', async () => {
    const avail = await checkBiometricsAvailable();
    expect(avail).toBe(true);
  });

  it('returns correct biometric label for Fingerprint', async () => {
    const label = await getBiometricTypeLabel();
    expect(label).toBe('Fingerprint');
  });

  it('manages biometric lock preference in SecureStore', async () => {
    expect(await isBiometricLockEnabled()).toBe(false);
    await setBiometricLockEnabled(true);
    expect(await isBiometricLockEnabled()).toBe(true);
    await setBiometricLockEnabled(false);
    expect(await isBiometricLockEnabled()).toBe(false);
  });

  it('authenticates user and marks session unlocked', async () => {
    const success = await authenticateWithBiometrics();
    expect(success).toBe(true);
    expect(shouldPromptBiometricLock()).toBe(false);
  });

  it('triggers lock when background timeout exceeds 2 minutes', () => {
    markSessionUnlocked();
    expect(shouldPromptBiometricLock()).toBe(false);

    recordBackgroundTimestamp();
    // Inactivity timeout not yet exceeded
    expect(shouldPromptBiometricLock()).toBe(false);
  });
});
