import { neon, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import * as schema from "@money-matters/db";
import { logger } from "./logger.js";

/**
 * Attach `error` listeners to a WebSocket-backed Neon pool and every client it
 * opens. On Cloudflare Workers, Cloudflare tears the underlying socket down once
 * the invocation ends; the pooled `pg` client then emits `'error'` with
 * "Network connection lost.". Without a listener Node's EventEmitter rethrows
 * that as an uncaught exception (an unhandled rejection), which is exactly the
 * noise this driver produced in production. Swallowing it here is safe: the
 * socket is being closed on purpose after the response has already been sent.
 */
function silenceSocketTeardown(pool: Pool) {
  pool.on("error", (err) => {
    logger.warn("Neon pool socket error (ignored)", { message: (err as Error)?.message });
  });
  pool.on("connect", (client) => {
    client.on("error", (err: Error) => {
      logger.warn("Neon client socket error (ignored)", { message: err?.message });
    });
  });
}

/**
 * Request-scoped WebSocket-backed client. Use ONLY when interactive
 * transactions are required — e.g. the RLS `SET LOCAL` that tRPC's
 * `tenantProcedure` runs inside `ctx.db.transaction(...)`.
 *
 * The caller MUST close the returned pool once the response is built, e.g.
 * `ctx.waitUntil(pool.end())`. A pool that is never closed leaks one Neon
 * connection per request, which trends toward connection exhaustion.
 */
export function createDbClient(connectionString: string) {
  const pool = new Pool({ connectionString });
  silenceSocketTeardown(pool);
  return { db: drizzle(pool, { schema }), pool };
}

/**
 * Request-scoped HTTP-backed client. There is no socket to leak, so this is the
 * right default on Workers for query paths that do NOT need interactive
 * transactions. Interactive transactions (BEGIN ... COMMIT across multiple
 * awaits) are unsupported here — use {@link createDbClient} for those.
 */
export function createHttpDbClient(connectionString: string) {
  return drizzleHttp(neon(connectionString), { schema });
}
