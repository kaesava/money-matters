import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { verifyJwt, upsertUserFromJwt, logger, createDbClient } from '@money-matters/core';
import { db, tenantUsers } from '@money-matters/db';
import { createTenantHandler } from '@money-matters/capability-tenant';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { inngest } from '../inngest/client.js';

export const MONEY_MATTERS_APP_ID = '01908bde-34bb-7b19-a178-574211bc93aa';

export interface EdgeContextEnv {
  DATABASE_URL?: string;
  NEXT_PUBLIC_NEON_AUTH_URL?: string;
  NEON_AUTH_BASE_URL?: string;
}

export interface ResolvedClaims {
  userId: string;
  email: string;
  displayName?: string;
}

/**
 * Extracts correlation ID from request header or generates a new UUID.
 * Propagates the correlation ID to the outgoing response headers.
 */
export function extractCorrelationId(req: Request, resHeaders?: Headers): string {
  const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();
  if (resHeaders) {
    resHeaders.set('x-correlation-id', correlationId);
  }
  return correlationId;
}

/**
 * Extracts bearer token or Neon Auth session cookie from request headers.
 */
export function extractAuthToken(req: Request): string {
  const authHeader = req.headers.get('authorization');
  let token = authHeader?.split(' ')[1] ?? '';

  if (!token) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(
        /(?:__Secure-)?(?:neon-auth\.session_token|better-auth\.session_token|session_token|neon_auth_session|session)=([^;]+)/
      );
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
  }
  return token;
}

/**
 * Fallback: Resolves session claims directly from the database with a 2-second timeout.
 */
export async function resolveClaimsFromDatabase(
  token: string,
  requestDb: ReturnType<typeof createDbClient> | typeof db,
  correlationId: string
): Promise<ResolvedClaims | null> {
  const cleanToken = token.split('.')[0];
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('DB session lookup timed out after 2000ms')), 2000);
    });

    const queryPromise = requestDb.execute<{ userId: string; email: string; name: string }>(
      sql`SELECT s."userId" as "userId", u.email as "email", u.name as "name"
          FROM neon_auth.session s
          JOIN neon_auth.user u ON s."userId" = u.id
          WHERE (s.token = ${token} OR s.token = ${cleanToken})
            AND s."expiresAt" > NOW()
          LIMIT 1`
    );

    const dbSessions = await Promise.race([queryPromise, timeoutPromise]);
    const rows = Array.isArray(dbSessions)
      ? dbSessions
      : (dbSessions as { rows: { userId: string; email: string; name: string }[] }).rows;
    const dbSession = rows?.[0];

    if (dbSession) {
      return {
        userId: dbSession.userId,
        email: dbSession.email,
        displayName: dbSession.name,
      };
    }

    logger.warn('DB session SQL query returned 0 rows', { correlationId, tokenSnippet: token.substring(0, 10) });
    return null;
  } catch (err: unknown) {
    logger.error('Database session lookup failed in edge context', { correlationId, err });
    return null;
  }
}

/**
 * Fallback: Verifies session with Neon Auth endpoint using AbortController with 2s timeout.
 */
export async function resolveClaimsFromNeonAuth(
  req: Request,
  env: EdgeContextEnv | undefined,
  correlationId: string
): Promise<ResolvedClaims | null> {
  const authBase =
    env?.NEXT_PUBLIC_NEON_AUTH_URL ||
    env?.NEON_AUTH_BASE_URL ||
    process.env.NEXT_PUBLIC_NEON_AUTH_URL ||
    process.env.NEON_AUTH_BASE_URL;

  if (!authBase) {
    logger.warn('Neon Auth base URL is not configured in env', { correlationId });
    return null;
  }

  const cookieHeader = req.headers.get('cookie');
  const authHeader = req.headers.get('authorization');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    logger.debug('Attempting Neon Auth session verification fallback', {
      correlationId,
      authBase,
      hasCookie: Boolean(cookieHeader),
      hasAuthHeader: Boolean(authHeader),
    });

    const authRes = await fetch(`${authBase}/get-session`, {
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...(authHeader ? { authorization: authHeader } : {}),
        'x-correlation-id': correlationId,
      },
      signal: controller.signal,
    });

    if (!authRes.ok) {
      logger.warn('Neon Auth /get-session returned non-OK status', { correlationId, status: authRes.status });
      return null;
    }

    const sessionData = (await authRes.json()) as { user?: { id?: string; email?: string; name?: string } };
    if (sessionData?.user?.id && sessionData?.user?.email) {
      return {
        userId: sessionData.user.id,
        email: sessionData.user.email,
        displayName: sessionData.user.name ?? undefined,
      };
    }

    logger.warn('Neon Auth /get-session missing user ID or email', { correlationId });
    return null;
  } catch (err: unknown) {
    logger.error('Neon Auth endpoint fallback lookup failed', { correlationId, err });
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Resolves or auto-provisions tenant membership for authenticated claims.
 */
export async function resolveTenantMembership(
  requestDb: ReturnType<typeof createDbClient> | typeof db,
  claims: ResolvedClaims,
  requestedTenantId: string | null,
  correlationId: string
): Promise<{ tenantId: string | null; role: string | null; appId: string }> {
  await upsertUserFromJwt(claims.userId, claims.email, claims.displayName, requestDb);

  const userMemberships = await requestDb
    .select({
      tenantId: tenantUsers.tenantId,
      role: tenantUsers.role,
      appId: tenantUsers.appId,
    })
    .from(tenantUsers)
    .where(
      and(
        eq(tenantUsers.userId, claims.userId),
        eq(tenantUsers.inviteStatus, 'ACCEPTED'),
        isNull(tenantUsers.archivedAt)
      )
    );

  const matchedMembership = requestedTenantId
    ? userMemberships.find((m) => m.tenantId === requestedTenantId)
    : undefined;

  const membership = matchedMembership ?? userMemberships[0];
  if (membership?.tenantId) {
    return {
      tenantId: membership.tenantId,
      role: membership.role ?? null,
      appId: membership.appId ?? MONEY_MATTERS_APP_ID,
    };
  }

  try {
    const handler = createTenantHandler(requestDb);
    const result = await handler({ name: 'My Household' }, MONEY_MATTERS_APP_ID, claims.userId);

    inngest.send({
      name: 'auth/user.signup',
      data: {
        userId: claims.userId,
        email: claims.email,
        displayName: claims.displayName ?? undefined,
      },
    }).catch(() => {});

    return {
      tenantId: result.tenantId,
      role: 'OWNER',
      appId: MONEY_MATTERS_APP_ID,
    };
  } catch (err: unknown) {
    logger.error('Auto-provisioning tenant in edge context failed', { correlationId, err });
    return {
      tenantId: null,
      role: null,
      appId: MONEY_MATTERS_APP_ID,
    };
  }
}

/**
 * Creates edge context with correlation ID tracing, DB connection pooling, and fallback session resolution.
 */
export async function createEdgeContext(
  { req, resHeaders }: FetchCreateContextFnOptions,
  env?: EdgeContextEnv
) {
  const correlationId = extractCorrelationId(req, resHeaders);
  const connectionString = env?.DATABASE_URL || process.env.DATABASE_URL;
  const requestDb = connectionString ? createDbClient(connectionString) : db;

  const token = extractAuthToken(req);
  let claims = token ? await verifyJwt(token) : null;

  if (!claims && token) {
    claims = await resolveClaimsFromDatabase(token, requestDb, correlationId);
  }

  if (!claims && (token || req.headers.get('cookie'))) {
    claims = await resolveClaimsFromNeonAuth(req, env, correlationId);
  }

  if (!claims) {
    return {
      req,
      resHeaders,
      db: requestDb,
      session: null,
      userId: null,
      tenantId: null,
      email: null,
      appId: null,
      correlationId,
    };
  }

  const rawTenantHeader = req.headers.get('x-tenant-id') ?? req.headers.get('x-active-tenant');
  const requestedTenantId = rawTenantHeader || null;

  const { tenantId, role, appId } = await resolveTenantMembership(
    requestDb,
    claims,
    requestedTenantId,
    correlationId
  );

  return {
    req,
    resHeaders,
    db: requestDb,
    session: {
      userId: claims.userId,
      email: claims.email,
      tenantId,
      appId,
      role,
    },
    userId: claims.userId,
    tenantId,
    email: claims.email,
    appId,
    correlationId,
  };
}

export type EdgeContext = Awaited<ReturnType<typeof createEdgeContext>>;

