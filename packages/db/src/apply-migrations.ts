import { Client } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const MIGRATIONS_TO_RUN = [
  "0028_unify_bill_categories_and_schedules.sql",
  "0029_add_goal_recurrence_to_pools.sql",
  "0030_unified_flat_envelopes.sql",
];

async function applyFiles(client: Client): Promise<void> {
  for (const migrationFile of MIGRATIONS_TO_RUN) {
    const filePath = path.resolve(import.meta.dirname, "../drizzle", migrationFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filePath}`);
    }
    console.log(`📄 Running migration: ${migrationFile}...`);
    const sqlContent = fs.readFileSync(filePath, "utf-8");
    await client.query(sqlContent);
    console.log(`✅ ${migrationFile} applied successfully!`);
  }
}

async function run(): Promise<void> {
  const isProd = process.argv.includes("--prod");
  const envFile = isProd ? "../../.env" : "../../.env.development";
  dotenv.config({ path: envFile });

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(`DATABASE_URL missing in ${envFile}`);
  }

  const targetEnv = isProd ? "PRODUCTION" : "DEVELOPMENT";
  console.log(`🚀 Executing pending migrations on [${targetEnv}]...`);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await applyFiles(client);
    console.log(`🎉 All pending migrations applied cleanly to [${targetEnv}]!`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Migration failed on [${targetEnv}]:`, message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run().catch((err: unknown) => {
  console.error("Unhandled migration failure:", err);
  process.exit(1);
});
