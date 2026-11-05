/**
 * Expo SQLite Local Cache Layer
 *
 * Scopes cached models by composite key `tenantId:userId:queryKey`,
 * enforces Zod runtime schema validation, provides TTL eviction,
 * and purges on logout and tenant-switching.
 */
import * as SQLite from 'expo-sqlite';
import { z } from 'zod';
import { logger } from './logger';

const DB_NAME = 'moneymatters_cache.db';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
    CREATE TABLE IF NOT EXISTS query_cache_v2 (
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      query_key TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (tenant_id, user_id, query_key)
    );
  `);
}

function resolveScope(tenantIdOrKey: string, userId?: string, queryKey?: string) {
  if (userId !== undefined && queryKey !== undefined) {
    return { tenantId: tenantIdOrKey, userId, queryKey };
  }
  // Fallback for single-argument callers: parse prefix or fallback to global scope
  const parts = tenantIdOrKey.split(':');
  if (parts.length >= 3) {
    return { tenantId: parts[0]!, userId: parts[1]!, queryKey: parts.slice(2).join(':') };
  }
  return { tenantId: 'default', userId: 'default', queryKey: tenantIdOrKey };
}

/**
 * Persists query result snapshot into SQLite cache scoped by tenant, user, and key.
 */
export async function setCachedQueryData<T>(
  tenantId: string,
  userId: string,
  queryKey: string,
  data: T
): Promise<void>;
export async function setCachedQueryData<T>(
  compositeKey: string,
  data: T
): Promise<void>;
export async function setCachedQueryData<T>(
  tenantIdOrKey: string,
  userIdOrData: string | T,
  queryKey?: string,
  data?: T
): Promise<void> {
  const isCompositeCall = queryKey === undefined;
  const scope = isCompositeCall
    ? resolveScope(tenantIdOrKey)
    : { tenantId: tenantIdOrKey, userId: userIdOrData as string, queryKey };
  const payload = isCompositeCall ? (userIdOrData as T) : data;

  try {
    const db = await getCacheDatabase();
    if (!db) return;

    const serialized = JSON.stringify(payload);
    const now = Date.now();

    await db.runAsync(
      `INSERT OR REPLACE INTO query_cache_v2 (tenant_id, user_id, query_key, data, updated_at)
       VALUES (?, ?, ?, ?, ?);`,
      [scope.tenantId, scope.userId, scope.queryKey, serialized, now]
    );
  } catch (err) {
    logger.warn('Failed to write query data to SQLite cache', { err, queryKey: scope.queryKey });
  }
}

/**
 * Reads cached query data from SQLite cache with optional Zod schema validation and TTL check.
 */
export async function getCachedQueryData<T>(
  tenantId: string,
  userId: string,
  queryKey: string,
  schema?: z.ZodType<T>,
  maxAgeMs?: number
): Promise<T | null>;
export async function getCachedQueryData<T>(
  compositeKey: string,
  schema?: z.ZodType<T>,
  maxAgeMs?: number
): Promise<T | null>;
export async function getCachedQueryData<T>(
  tenantIdOrKey: string,
  userIdOrSchema?: string | z.ZodType<T>,
  queryKeyOrMaxAge?: string | number,
  schema?: z.ZodType<T>,
  maxAgeMs?: number
): Promise<T | null> {
  const isCompositeCall = typeof userIdOrSchema !== 'string';
  const scope = isCompositeCall
    ? resolveScope(tenantIdOrKey)
    : { tenantId: tenantIdOrKey, userId: userIdOrSchema as string, queryKey: queryKeyOrMaxAge as string };
  const targetSchema = isCompositeCall ? (userIdOrSchema as z.ZodType<T> | undefined) : schema;
  const ttlMs = isCompositeCall
    ? (typeof queryKeyOrMaxAge === 'number' ? queryKeyOrMaxAge : DEFAULT_TTL_MS)
    : (maxAgeMs ?? DEFAULT_TTL_MS);

  try {
    const db = await getCacheDatabase();
    if (!db) return null;

    const row = await db.getFirstAsync<{ data: string; updated_at: number }>(
      'SELECT data, updated_at FROM query_cache_v2 WHERE tenant_id = ? AND user_id = ? AND query_key = ?;',
      [scope.tenantId, scope.userId, scope.queryKey]
    );

    if (!row || !row.data) return null;

    if (Date.now() - row.updated_at > ttlMs) {
      await db.runAsync(
        'DELETE FROM query_cache_v2 WHERE tenant_id = ? AND user_id = ? AND query_key = ?;',
        [scope.tenantId, scope.userId, scope.queryKey]
      );
      return null;
    }

    const parsedRaw = JSON.parse(row.data) as unknown;
    if (targetSchema) {
      const validation = targetSchema.safeParse(parsedRaw);
      if (!validation.success) {
        logger.warn('SQLite cached query validation failed, purging row', {
          queryKey: scope.queryKey,
          error: validation.error.message,
        });
        await db.runAsync(
          'DELETE FROM query_cache_v2 WHERE tenant_id = ? AND user_id = ? AND query_key = ?;',
          [scope.tenantId, scope.userId, scope.queryKey]
        );
        return null;
      }
      return validation.data;
    }

    return parsedRaw as T;
  } catch (err) {
    logger.warn('Failed to read query data from SQLite cache', { err, queryKey: scope.queryKey });
    return null;
  }
}

/**
 * Purges query cache on logout or tenant switch.
 * If tenantId and userId are supplied, purges scoped data; otherwise clears entire cache.
 */
export async function clearQueryCache(tenantId?: string, userId?: string): Promise<void> {
  try {
    const db = await getCacheDatabase();
    if (!db) return;

    if (tenantId && userId) {
      await db.runAsync(
        'DELETE FROM query_cache_v2 WHERE tenant_id = ? AND user_id = ?;',
        [tenantId, userId]
      );
    } else if (tenantId) {
      await db.runAsync('DELETE FROM query_cache_v2 WHERE tenant_id = ?;', [tenantId]);
    } else {
      await db.runAsync('DELETE FROM query_cache_v2;');
    }
  } catch (err) {
    logger.warn('Failed to clear SQLite query cache', { err });
  }
}
