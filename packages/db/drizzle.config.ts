import type { Config } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("System Environment Failure: DATABASE_URL target is not configured.");
}

export default {
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
