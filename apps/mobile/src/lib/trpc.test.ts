import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as SecureStore from 'expo-secure-store';

vi.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./auth', () => ({
  authClient: {
    useSession: vi.fn(),
    getSession: vi.fn().mockResolvedValue({ data: null }),
    getCookie: vi.fn().mockReturnValue(null),
  },
}));

import {
  getStoredTokenAndCookie,
  setActiveSessionToken,
  setActiveTenantId,
  getActiveTenantId,
} from './trpc';

describe('mobile trpc token and session helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SecureStore.setItemAsync).mockResolvedValue(undefined);
    vi.mocked(SecureStore.deleteItemAsync).mockResolvedValue(undefined);
    setActiveSessionToken(null);
    setActiveTenantId(null);
  });

  it('manages active tenant ID in memory and secure store', () => {
    expect(getActiveTenantId()).toBeNull();
    setActiveTenantId('tenant-123');
    expect(getActiveTenantId()).toBe('tenant-123');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('money_matters_active_tenant_id', 'tenant-123');

    setActiveTenantId(null);
    expect(getActiveTenantId()).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('money_matters_active_tenant_id');
  });

  it('retrieves token directly from money-matters_session_token', async () => {
    vi.mocked(SecureStore.getItemAsync).mockImplementation(async (key: string) => {
      if (key === 'money-matters_session_token') return 'direct-token-abc';
      return null;
    });

    const result = await getStoredTokenAndCookie();
    expect(result.token).toBe('direct-token-abc');
  });

  it('recovers token from money-matters_session_data cache', async () => {
    vi.mocked(SecureStore.getItemAsync).mockImplementation(async (key: string) => {
      if (key === 'money-matters_session_data') {
        return JSON.stringify({
          user: { id: 'u1' },
          session: { token: 'cached-session-token-xyz' },
        });
      }
      return null;
    });

    const result = await getStoredTokenAndCookie();
    expect(result.token).toBe('cached-session-token-xyz');
  });

  it('recovers token and cookie from money-matters_cookie and strips signatures', async () => {
    vi.mocked(SecureStore.getItemAsync).mockImplementation(async (key: string) => {
      if (key === 'money-matters_cookie') {
        return JSON.stringify({
          '__Secure-neon-auth.session_token': {
            value: 's:raw-token-123.sig456',
            expires: new Date(Date.now() + 10000).toISOString(),
          },
        });
      }
      return null;
    });

    const result = await getStoredTokenAndCookie();
    expect(result.token).toBe('raw-token-123');
    expect(result.cookie).toContain('__Secure-neon-auth.session_token=s:raw-token-123.sig456');
  });
});
