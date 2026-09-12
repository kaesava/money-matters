import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      version: '1.0.0-beta.1',
      android: {
        versionCode: 42,
      },
    },
  },
}));

import { getMobileVersionInfo } from './version';

describe('getMobileVersionInfo', () => {
  it('returns valid AppVersionInfo conforming to AppVersionInfoSchema', () => {
    const info = getMobileVersionInfo();
    expect(info).toBeDefined();
    expect(info.appName).toBe('Money Matters Mobile');
    expect(info.version).toBe('1.0.0-beta.1');
    expect(info.buildNumber).toBe('42');
    expect(['development', 'preview', 'beta', 'production']).toContain(info.channel);
    expect(info.platform).toBe('android');
    expect(info.formattedVersion).toBeDefined();
    expect(typeof info.formattedVersion).toBe('string');
  });
});
