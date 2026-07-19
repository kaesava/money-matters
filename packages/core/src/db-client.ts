import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

export function createDbClient(connectionString: string) {
  const pool = new Pool({ connectionString });
  return drizzle(pool);
}

