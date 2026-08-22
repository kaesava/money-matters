import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { verifyJwt, upsertUserFromJwt, logger } from "@money-matters/core";
import { db, tenantUsers, tenants } from "@money-matters/db";
import { createTenantHandler } from "@money-matters/capability-tenant";
import { eq, and, isNull, sql } from "drizzle-orm";
import type { createEdgeContext } from "./edge-context.js";
import { posthog } from '../lib/posthog.js';
import { inngest } from '../inngest/client.js';
import { MONEY_MATTERS_APP_ID } from './edge-context.js';

export { MONEY_MATTERS_APP_ID } from './edge-context.js';

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const rawCorrelationId = req.headers["x-correlation-id"];
  const correlationId =
    (Array.isArray(rawCorrelationId) ? rawCorrelationId[0] : rawCorrelationId) || crypto.randomUUID();

  const authHeader = req.headers.authorization;
  let token = authHeader?.split(" ")[1] ?? "";

  // Fallback to cookie if no Authorization bearer token is provided
  if (!token && req.headers.cookie) {
    const cookieHeader = req.headers.cookie;
    const match = cookieHeader.match(/(?:__Secure-)?(?:neon-auth\.session_token|better-auth\.session_token|session_token|neon_auth_session|session)=([^;\s]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  let claims = token ? await verifyJwt(token) : null;

  // Fallback for opaque Neon DB / Better Auth database session tokens
  if (!claims && token) {
    const cleanToken = token.split(".")[0];
    try {
      const dbSessions = await db.execute<{ userId: string; email: string; name: string }>(
        sql`SELECT s."userId" as "userId", u.email as "email", u.name as "name"
            FROM neon_auth.session s
            JOIN neon_auth.user u ON s."userId" = u.id
            WHERE (s.token = ${token} OR s.token = ${cleanToken})
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
      }
    } catch (err) {
      logger.error("Database session lookup failed", { correlationId, err });
    }
  }

  // Fallback: Verify session directly with Neon Auth endpoint if cookie/token is set but DB query returned no rows
  if (!claims && (token || req.headers.cookie)) {
    try {
      const authBase = process.env.NEXT_PUBLIC_NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL;
      if (authBase) {
        const authRes = await fetch(`${authBase}/get-session`, {
          headers: {
            ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
            ...(authHeader ? { authorization: authHeader } : {}),
            "x-correlation-id": correlationId,
          },
        });
        if (authRes.ok) {
          const sessionData = (await authRes.json()) as { user?: { id?: string; email?: string; name?: string } };
          if (sessionData?.user?.id && sessionData?.user?.email) {
            claims = {
              userId: sessionData.user.id,
              email: sessionData.user.email,
              displayName: sessionData.user.name ?? undefined,
            };
          }
        }
      }
    } catch (err: unknown) {
      logger.debug("Neon Auth endpoint fallback lookup failed in Fastify context", { correlationId, err });
    }
  }

  if (!claims) {
    return {
      req,
      res,
      db,
      session: null,
      userId: null,
      tenantId: null,
      email: null,
      appId: null,
      correlationId,
    };
  }

  await upsertUserFromJwt(claims.userId, claims.email, claims.displayName);

  if (posthog) {
    posthog.identify({
      distinctId: claims.userId,
      properties: {
        display_name: claims.displayName ?? undefined,
      },
    });
  }

  const rawTenantHeader = req.headers["x-tenant-id"] ?? req.headers["x-active-tenant"];
  const requestedTenantId = Array.isArray(rawTenantHeader) ? rawTenantHeader[0] : rawTenantHeader;

  const userMemberships = await db
    .select({
      tenantId: tenantUsers.tenantId,
      role: tenantUsers.role,
      appId: tenants.appId,
    })
    .from(tenantUsers)
    .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
    .where(
      and(
        eq(tenantUsers.userId, claims.userId),
        eq(tenants.appId, MONEY_MATTERS_APP_ID),
        eq(tenantUsers.inviteStatus, "ACCEPTED"),
        isNull(tenantUsers.archivedAt)
      )
    );

  const matchedMembership = requestedTenantId
    ? userMemberships.find((m) => m.tenantId === requestedTenantId)
    : undefined;

  const membership = matchedMembership ?? userMemberships[0];

  let tenantId = membership?.tenantId ?? null;
  let role = membership?.role ?? null;
  const appId = membership?.appId ?? MONEY_MATTERS_APP_ID;

  if (!tenantId) {
    try {
      const handler = createTenantHandler(db);
      const result = await handler({ name: "My Household" }, appId, claims.userId);
      tenantId = result.tenantId;
      role = "OWNER";

      // Dispatch non-blocking signup & welcome email event to Inngest
      inngest.send({
        name: "auth/user.signup",
        data: {
          userId: claims.userId,
          email: claims.email,
          displayName: claims.displayName ?? undefined,
        },
      }).catch(() => {});
    } catch (err) {
      logger.error("Auto-provisioning tenant failed", { correlationId, err });
    }
  }

  return {
    req,
    res,
    db,
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

export type FastifyContext = Awaited<ReturnType<typeof createContext>>;
export type EdgeContext = Awaited<ReturnType<typeof createEdgeContext>>;
export type Context = FastifyContext | EdgeContext;

