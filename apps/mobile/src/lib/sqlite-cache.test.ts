import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

const mockDb = {
  execAsync: vi.fn().mockResolvedValue(undefined),
  runAsync: vi.fn().mockResolvedValue(undefined),
  getFirstAsync: vi.fn().mockResolvedValue(null),
};

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(async () => mockDb),
}));

import { setCachedQueryData, getCachedQueryData, clearQueryCache } from './sqlite-cache';

describe('sqlite-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores and retrieves cached data with composite keys', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({
      data: JSON.stringify({ id: '1', balance: 500 }),
      updated_at: Date.now(),
    });

    await setCachedQueryData('tenant-1', 'user-1', 'home_summary', { id: '1', balance: 500 });
    expect(mockDb.runAsync).toHaveBeenCalled();

    const data = await getCachedQueryData<{ id: string; balance: number }>(
      'tenant-1',
      'user-1',
      'home_summary'
    );
    expect(data).toEqual({ id: '1', balance: 500 });
  });

  it('validates cached data against Zod schema and discards corrupted rows', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({
      data: JSON.stringify({ invalidField: true }),
      updated_at: Date.now(),
    });

    const TestSchema = z.object({ id: z.string() }).strict();
    const result = await getCachedQueryData(
      'tenant-1',
      'user-1',
      'home_summary',
      TestSchema
    );

    expect(result).toBeNull();
    // Verify corrupted row is deleted
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM query_cache_v2'),
      ['tenant-1', 'user-1', 'home_summary']
    );
  });

  it('evicts expired cache rows based on TTL', async () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    mockDb.getFirstAsync.mockResolvedValueOnce({
      data: JSON.stringify({ id: '1' }),
      updated_at: eightDaysAgo,
    });

    const result = await getCachedQueryData('tenant-1', 'user-1', 'home_summary');
    expect(result).toBeNull();
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM query_cache_v2'),
      ['tenant-1', 'user-1', 'home_summary']
    );
  });

  it('clears query cache scoped by tenant or globally', async () => {
    await clearQueryCache('tenant-1', 'user-1');
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'DELETE FROM query_cache_v2 WHERE tenant_id = ? AND user_id = ?;',
      ['tenant-1', 'user-1']
    );

    await clearQueryCache();
    expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM query_cache_v2;');
  });
});
