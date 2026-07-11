import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

export function createDbClient(connectionString: string) {
  const sql = neon(connectionString);
  return drizzle(sql);
}

