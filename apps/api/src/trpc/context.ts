import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { verifyJwt } from "@money-matters/core";
import { db, users, householdMembers } from "@money-matters/db";
import { eq } from "drizzle-orm";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const token = req.headers.authorization?.split(" ")[1] ?? "";
  const claims = await verifyJwt(token);

  if (!claims) {
    return { req, res, session: null, userId: null, tenantId: null, email: null, appId: null };
  }

  // ── Eager user mirror upsert ──────────────────────────────────────────────
  // Keep public.users in sync with neon_auth.user on every authenticated request.
  // ON CONFLICT ensures this is idempotent and race-safe.
  await db
    .insert(users)
    .values({
      id: claims.userId,
      email: claims.email,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: claims.email,
        updatedAt: new Date(),
      },
    });

  // ── Tenant resolution ─────────────────────────────────────────────────────
  // Resolve the user's household membership to determine tenantId for this request.
  // If the user has not yet created a household (post-signup), tenantId is null —
  // that is valid for the createHousehold flow which runs in authenticatedProcedure.
  const [membership] = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
      appId: householdMembers.appId,
    })
    .from(householdMembers)
    .where(eq(householdMembers.userId, claims.userId))
    .limit(1);

  const tenantId = membership?.householdId ?? null;
  const appId = membership?.appId ?? "money-matters";

  return {
    req,
    res,
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
