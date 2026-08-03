import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema/index.js";

// Requires DATABASE_URL to be set in environment
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
// Neon closes idle sockets when a serverless invocation ends; without a listener
// the pooled client rethrows the resulting "Network connection lost." as an
// unhandled rejection. Swallow it — the socket teardown is expected.
pool.on("error", () => {});
import type { PgDatabase } from "drizzle-orm/pg-core";

export const db = drizzle(pool, { schema });
export type DbClient = typeof db;
export type DbOrTx = PgDatabase<any, any, any>;

export * from "./schema/index.js";
