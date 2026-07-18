import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { verifyJwt, upsertUserFromJwt } from "@money-matters/core";
import { db, tenantUsers, MONEY_MATTERS_APP_ID } from "@money-matters/db";
import { eq, sql } from "drizzle-orm";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1] ?? "";
  console.log(`[DEBUG auth] Received Authorization Header: "${authHeader}"`);
  console.log(`[DEBUG auth] Extracted Token: "${token}"`);
  
  let claims = await verifyJwt(token);
  console.log(`[DEBUG auth] Verified Claims (JWT):`, claims);

  // Fallback: If JWT verification fails, check if this is an opaque session token in the database
  if (!claims && token && token.length === 32) {
    console.log(`[DEBUG auth] Token is not a JWT. Looking up session in database...`);
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
        console.log(`[DEBUG auth] Verified Claims (DB):`, claims);
      } else {
        console.log(`[DEBUG auth] No active database session found matching this token.`);
      }
    } catch (err) {
      console.error("[DEBUG auth] Database session lookup failed:", err);
    }
  }

  if (!claims) {
    console.log(`[DEBUG auth] Authentication failed: verifyJwt returned null and no DB session matched`);
    return { req, res, session: null, userId: null, tenantId: null, email: null, appId: null };
  }

  // ── Eager user mirror upsert ──────────────────────────────────────────────
  // Keep public.users in sync with neon_auth.user on every authenticated request.
  await upsertUserFromJwt(claims.userId, claims.email, claims.displayName);

  // ── Tenant resolution ─────────────────────────────────────────────────────
  // Resolve the user's tenant membership to determine tenantId for this request.
  // If the user has not yet created a tenant (post-signup), tenantId is null —
  // that is valid for the createTenant flow which runs in authenticatedProcedure.
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
    db: db as any, // default global database client
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
