import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { verifyJwt, upsertUserFromJwt, logger } from "@money-matters/core";
import { db, tenantUsers } from "@money-matters/db";
import { eq, sql } from "drizzle-orm";

export const MONEY_MATTERS_APP_ID = "01908bde-34bb-7b19-a178-574211bc93aa";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1] ?? "";
  
  let claims = await verifyJwt(token);

  // Fallback: If JWT verification fails, check if this is an opaque session token in the database
  if (!claims && token && token.length === 32) {
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
      logger.error({ err }, "Database session lookup failed");
    }
  }

  if (!claims) {
    logger.warn("Authentication failed: verifyJwt returned null and no DB session matched");
    return { req, res, session: null, userId: null, tenantId: null, email: null, appId: null };
  }

  // ── Eager user mirror upsert ──────────────────────────────────────────────
  // Keep public.users in sync with neon_auth.user on every authenticated request.
  await upsertUserFromJwt(claims.userId, claims.email, claims.displayName);

  // ── Tenant resolution ─────────────────────────────────────────────────────
  // Resolve the user's tenant membership to determine tenantId for this request.
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

  return {
    req,
    res,
    db: db as any,
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

export type Context = Awaited<ReturnType<typeof createContext>>;
