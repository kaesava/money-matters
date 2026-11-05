import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@money-matters/db";

export function createDbClient(connectionString?: string) {
  const conn = connectionString || process.env.DATABASE_URL;
  if (!conn) {
    throw new Error("DATABASE_URL is required to create a database client.");
  }
  const pool = new Pool({ connectionString: conn });
  return drizzle(pool, { schema });
}

