import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
// 1. Add the explicit .js extension to the schema import path
import * as schema from "./schema/index.js";

// Requires DATABASE_URL to be set in environment
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool, { schema });

// 2. Add the explicit .js extension to the barrel export path
export * from "./schema/index.js";
