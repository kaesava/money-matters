import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { verifyJwt, upsertUserFromJwt, logger, createDbClient } from '@money-matters/core';
import { db, tenantUsers } from '@money-matters/db';
import { createTenantHandler } from '@money-matters/capability-tenant';
import { eq, sql } from 'drizzle-orm';
import { inngest } from '../inngest/client.js';

export const MONEY_MATTERS_APP_ID = '01908bde-34bb-7b19-a178-574211bc93aa';

export async function createEdgeContext({ req, resHeaders }: FetchCreateContextFnOptions, env?: any) {
  const connectionString = env?.DATABASE_URL || process.env.DATABASE_URL;
  const requestDb = connectionString ? createDbClient(connectionString) : db;

  const authHeader = req.headers.get('authorization');
  let token = authHeader?.split(' ')[1] ?? '';

  if (!token) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:__Secure-)?(?:neon-auth\.session_token|better-auth\.session_token|session_token|neon_auth_session|session)=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
  }

  let claims = await verifyJwt(token);

  // Fallback for opaque database session tokens
  if (!claims && token) {
    const cleanToken = token.split(".")[0];
    try {
      const dbSessions = await requestDb.execute<{ userId: string; email: string; name: string }>(
        sql`SELECT s."userId" as "userId", u.email as "email", u.name as "name"
            FROM neon_auth.session s
            JOIN neon_auth.user u ON s."userId" = u.id
            WHERE (s.token = ${token} OR s.token = ${cleanToken} OR s.id::text = ${cleanToken} OR s.id::text = ${token})
              AND s."expiresAt" > NOW()
            LIMIT 1`
      );
      const rows = Array.isArray(dbSessions)
        ? dbSessions
        : (dbSessions as { rows: { userId: string; email: string; name: string }[] }).rows;
      const dbSession = rows?.[0];
      if (dbSession) {
        claims = {
          userId: dbSession.userId,
          email: dbSession.email,
          displayName: dbSession.name,
        };
      } else {
        console.warn(`[createEdgeContext] DB session SQL query returned 0 rows for token: ${token.substring(0, 10)}... (cleanToken: ${cleanToken})`);
      }
    } catch (err) {
      console.error('[createEdgeContext] Database session lookup failed:', err);
    }
  }

  // Fallback: Verify session directly with Neon Auth endpoint if cookie/token is set
  if (!claims && (token || req.headers.get('cookie'))) {
    try {
      const authBase = env?.NEXT_PUBLIC_NEON_AUTH_URL || env?.NEON_AUTH_BASE_URL || process.env.NEXT_PUBLIC_NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL;
      const cookieHeader = req.headers.get('cookie');
      if (authBase) {
        console.log(`[createEdgeContext] Attempting fetch to ${authBase}/get-session with cookie: ${cookieHeader ? 'present' : 'absent'}, authHeader: ${authHeader ? 'present' : 'absent'}`);
        const authRes = await fetch(`${authBase}/get-session`, {
          headers: {
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
            ...(authHeader ? { authorization: authHeader } : {}),
          },
        });
        if (authRes.ok) {
          const sessionData = await authRes.json();
          if (sessionData?.user?.id && sessionData?.user?.email) {
            claims = {
              userId: sessionData.user.id,
              email: sessionData.user.email,
              displayName: sessionData.user.name ?? undefined,
            };
          } else {
            console.warn(`[createEdgeContext] Neon Auth /get-session returned status 200 but payload missing user id/email: ${JSON.stringify(sessionData)}`);
          }
        } else {
          console.warn(`[createEdgeContext] Neon Auth /get-session returned status ${authRes.status}: ${await authRes.text()}`);
        }
      } else {
        console.warn('[createEdgeContext] Neither NEXT_PUBLIC_NEON_AUTH_URL nor NEON_AUTH_BASE_URL is configured in env!');
      }
    } catch (err) {
      console.error('[createEdgeContext] Neon Auth endpoint fallback lookup failed:', err);
    }
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
    };
  }

  await upsertUserFromJwt(claims.userId, claims.email, claims.displayName, requestDb);

  const [membership] = await requestDb
    .select({
      tenantId: tenantUsers.tenantId,
      role: tenantUsers.role,
      appId: tenantUsers.appId,
    })
    .from(tenantUsers)
    .where(eq(tenantUsers.userId, claims.userId))
    .limit(1);

  let tenantId = membership?.tenantId ?? null;
  let role = membership?.role ?? null;
  const appId = membership?.appId ?? MONEY_MATTERS_APP_ID;

  if (!tenantId) {
    try {
      const handler = createTenantHandler(requestDb);
      const result = await handler({ name: 'My Household' }, appId, claims.userId);
      tenantId = result.tenantId;
      role = 'OWNER';

      // Dispatch non-blocking signup & welcome email event to Inngest
      inngest.send({
        name: 'auth/user.signup',
        data: {
          userId: claims.userId,
          email: claims.email,
          displayName: claims.displayName ?? undefined,
        },
      }).catch(() => {});
    } catch (err) {
      logger.error('Auto-provisioning tenant in edge context failed', { err });
    }
  }

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
  };
}

export type EdgeContext = Awaited<ReturnType<typeof createEdgeContext>>;
