import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
// 1. Add the explicit .js extension to the schema import path
import * as schema from "./schema/index.js";

// Requires DATABASE_URL to be set in environment
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// 2. Add the explicit .js extension to the barrel export path
export * from "./schema/index.js";
