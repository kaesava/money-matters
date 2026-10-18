/**
 * Expo SQLite Local Cache Layer
 *
 * Implements a read-through local cache for mobile read models (Envelopes balances,
 * Bank Accounts, and Recent Transactions) to ensure instantaneous cold starts and offline resiliency.
 */
import * as SQLite from 'expo-sqlite';
import { logger } from './logger';

const DB_NAME = 'moneymatters_cache.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getCacheDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (dbInstance) return dbInstance;
  try {
    if (typeof SQLite.openDatabaseAsync === 'function') {
      dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
      await initCacheTables(dbInstance);
      return dbInstance;
    }
  } catch (err) {
    logger.warn('Failed to initialize Expo SQLite database', { err });
  }
  return null;
}

async function initCacheTables(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS query_cache (
      query_key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

/**
 * Persists query result snapshot into SQLite cache.
 */
export async function setCachedQueryData<T>(queryKey: string, data: T): Promise<void> {
  try {
    const db = await getCacheDatabase();
    if (!db) return;

    const serialized = JSON.stringify(data);
    const now = Date.now();

    await db.runAsync(
      'INSERT OR REPLACE INTO query_cache (query_key, data, updated_at) VALUES (?, ?, ?);',
      [queryKey, serialized, now]
    );
  } catch (err) {
    logger.warn('Failed to write query data to SQLite cache', { err, queryKey });
  }
}

/**
 * Reads cached query data from SQLite cache.
 */
export async function getCachedQueryData<T>(queryKey: string): Promise<T | null> {
  try {
    const db = await getCacheDatabase();
    if (!db) return null;

    const row = await db.getFirstAsync<{ data: string; updated_at: number }>(
      'SELECT data, updated_at FROM query_cache WHERE query_key = ?;',
      [queryKey]
    );

    if (row && row.data) {
      return JSON.parse(row.data) as T;
    }
  } catch (err) {
    logger.warn('Failed to read query data from SQLite cache', { err, queryKey });
  }
  return null;
}

/**
 * Purges query cache on logout or tenant switch.
 */
export async function clearQueryCache(): Promise<void> {
  try {
    const db = await getCacheDatabase();
    if (!db) return;
    await db.runAsync('DELETE FROM query_cache;');
  } catch (err) {
    logger.warn('Failed to clear SQLite query cache', { err });
  }
}
