import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema/index.js";

// Enable HTTP connection reuse across Cloudflare Worker invocations within the same isolate.
// Without this, each Worker request pays a new TCP handshake cost to Neon's serverless proxy.
neonConfig.fetchConnectionCache = true;

// Requires DATABASE_URL to be set in environment
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool, { schema });
export type DbClient = typeof db;
export type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];
export type DbOrTx = DbClient | DbTransaction;

export * from "./schema/index.js";
export * from "./utils/get-pool-balances.util.js";

