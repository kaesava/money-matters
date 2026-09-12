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

const { mockImpactAsync, mockNotificationAsync, mockSelectionAsync } = vi.hoisted(() => ({
  mockImpactAsync: vi.fn(async () => {}),
  mockNotificationAsync: vi.fn(async () => {}),
  mockSelectionAsync: vi.fn(async () => {}),
}));

vi.mock('expo-haptics', () => ({
  impactAsync: mockImpactAsync,
  notificationAsync: mockNotificationAsync,
  selectionAsync: mockSelectionAsync,
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

import { isHapticsEnabled, setHapticsEnabled, triggerHaptic } from './haptics';

describe('haptics utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockSecureStore)) {
      delete mockSecureStore[key];
    }
  });

  it('defaults to haptics enabled', async () => {
    const enabled = await isHapticsEnabled();
    expect(enabled).toBe(true);
  });

  it('allows disabling and enabling haptics', async () => {
    await setHapticsEnabled(false);
    expect(await isHapticsEnabled()).toBe(false);

    await setHapticsEnabled(true);
    expect(await isHapticsEnabled()).toBe(true);
  });

  it('triggers impact haptics when enabled', async () => {
    await setHapticsEnabled(true);
    await triggerHaptic('light');
    expect(mockImpactAsync).toHaveBeenCalledWith('light');

    await triggerHaptic('medium');
    expect(mockImpactAsync).toHaveBeenCalledWith('medium');
  });

  it('triggers notification haptics when enabled', async () => {
    await setHapticsEnabled(true);
    await triggerHaptic('success');
    expect(mockNotificationAsync).toHaveBeenCalledWith('success');
  });

  it('triggers selection haptics when enabled', async () => {
    await setHapticsEnabled(true);
    await triggerHaptic('selection');
    expect(mockSelectionAsync).toHaveBeenCalled();
  });
});
