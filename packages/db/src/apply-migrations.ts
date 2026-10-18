import { Client } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

async function applyFiles(client: Client): Promise<void> {
  // Ensure __drizzle_migrations table exists to track applied migrations idempotently
  await client.query(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL UNIQUE,
      created_at bigint
    );
  `);

  const appliedRes = await client.query(`SELECT hash FROM "__drizzle_migrations"`);
  const appliedSet = new Set(appliedRes.rows.map((r: { hash: string }) => r.hash));

  const drizzleDir = path.resolve(import.meta.dirname, "../drizzle");
  const journalPath = path.join(drizzleDir, "meta/_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8")) as { entries: { tag: string }[] };

  for (const entry of journal.entries) {
    const migrationFile = `${entry.tag}.sql`;
    if (appliedSet.has(entry.tag)) {
      continue;
    }

    const filePath = path.join(drizzleDir, migrationFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filePath}`);
    }

    console.log(`📄 Running migration: ${migrationFile}...`);
    const sqlContent = fs.readFileSync(filePath, "utf-8");
    await client.query(sqlContent);
    await client.query(`INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [entry.tag, Date.now()]);
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
