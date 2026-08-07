import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { verifyJwt, upsertUserFromJwt, logger } from "@money-matters/core";
import { db, tenantUsers } from "@money-matters/db";
import { eq, sql } from "drizzle-orm";
import type { createEdgeContext } from "./edge-context.js";
import { posthog } from '../lib/posthog.js';

export const MONEY_MATTERS_APP_ID = "01908bde-34bb-7b19-a178-574211bc93aa";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG createContext] Incoming Authorization header:", req.headers.authorization);
    console.log("[DEBUG createContext] Incoming Cookie header:", req.headers.cookie);
  }

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

  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG createContext] Final token evaluated:", token ? `${token.substring(0, 15)}... (len: ${token.length})` : "NONE");
  }

  let claims = await verifyJwt(token);

  // Fallback for opaque Neon DB database session tokens
  if (!claims && token) {
    try {
      const dbSessions = await db.execute<{ userId: string; email: string; name: string }>(
        sql`SELECT s."userId" as "userId", u.email as "email", u.name as "name"
            FROM neon_auth.session s
            JOIN neon_auth.user u ON s."userId" = u.id
            WHERE s.token = ${token} AND s."expiresAt" > NOW()
            LIMIT 1`
      );
      const dbSession = Array.isArray(dbSessions) ? dbSessions[0] : (dbSessions as any)?.rows?.[0];
      if (dbSession) {
        claims = {
          userId: dbSession.userId,
          email: dbSession.email,
          displayName: dbSession.name,
        };
      }
    } catch (err) {
      logger.error("Database session lookup failed", { err });
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG createContext] Claims after verifyJwt & dbSession lookup:", claims);
  }

  if (!claims) {
    if (process.env.NODE_ENV === "development") {
      console.log("[DEBUG createContext] FAILED: claims is null. Cookie header was:", req.headers.cookie, "Token:", token);
    }
    return {
      req,
      res,
      db,
      session: null,
      userId: null,
      tenantId: null,
      email: null,
      appId: null,
    };
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG createContext] SUCCESS: Resolved claims for userId:", claims.userId);
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

  const [membership] = await db
    .select({
      tenantId: tenantUsers.tenantId,
      role: tenantUsers.role,
      appId: tenantUsers.appId,
    })
    .from(tenantUsers)
    .where(eq(tenantUsers.userId, claims.userId))
    .limit(1);

  const tenantId = membership?.tenantId ?? null;
  const appId = membership?.appId ?? MONEY_MATTERS_APP_ID;

  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG createContext] Membership result:", membership, "Resolved tenantId:", tenantId);
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
      role: membership?.role ?? null,
    },
    userId: claims.userId,
    tenantId,
    email: claims.email,
    appId,
  };
}

export type FastifyContext = Awaited<ReturnType<typeof createContext>>;
export type EdgeContext = Awaited<ReturnType<typeof createEdgeContext>>;
export type Context = FastifyContext | EdgeContext;
