import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(async () => null),
}));

import { setCachedQueryData, getCachedQueryData, clearQueryCache } from './sqlite-cache';

describe('sqlite-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles caching operations gracefully when database is unavailable or mocked', async () => {
    await expect(setCachedQueryData('test_key', { foo: 'bar' })).resolves.not.toThrow();
    const data = await getCachedQueryData('test_key');
    expect(data).toBeNull();
    await expect(clearQueryCache()).resolves.not.toThrow();
  });
});
