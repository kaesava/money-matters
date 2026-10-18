import { Client } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

async function ensureMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL UNIQUE,
      created_at bigint
    );
  `);
}

async function getAppliedMigrationHashes(client: Client): Promise<Set<string>> {
  const appliedRes = await client.query(`SELECT hash FROM "__drizzle_migrations"`);
  return new Set(appliedRes.rows.map((r: { hash: string }) => r.hash));
}

async function baselinePreExistingMigrations(
  client: Client,
  appliedSet: Set<string>,
  entries: { tag: string }[]
): Promise<void> {
  const tenantsTableRes = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'tenants'
    ) as exists;
  `);
  if (!tenantsTableRes.rows[0]?.exists) {
    return;
  }

  for (const entry of entries) {
    if (entry.tag.startsWith("0036") || entry.tag.startsWith("0037")) {
      break;
    }
    if (!appliedSet.has(entry.tag)) {
      await client.query(
        `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2) ON CONFLICT (hash) DO NOTHING`,
        [entry.tag, Date.now()]
      );
      appliedSet.add(entry.tag);
    }
  }
}

async function applySingleMigration(
  client: Client,
  entry: { tag: string },
  drizzleDir: string
): Promise<void> {
  const migrationFile = `${entry.tag}.sql`;
  const filePath = path.join(drizzleDir, migrationFile);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }

  console.log(`📄 Running migration: ${migrationFile}...`);
  const sqlContent = fs.readFileSync(filePath, "utf-8");
  try {
    await client.query(sqlContent);
    await client.query(
      `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2) ON CONFLICT (hash) DO NOTHING`,
      [entry.tag, Date.now()]
    );
    console.log(`✅ ${migrationFile} applied successfully!`);
  } catch (err: unknown) {
    const dbErr = err as { code?: string; message?: string };
    if (
      dbErr.code === "42710" ||
      dbErr.code === "42P07" ||
      dbErr.code === "42701" ||
      dbErr.message?.includes("already exists")
    ) {
      console.warn(`⚠️ ${migrationFile} pre-existing (${dbErr.message}). Marking as applied.`);
      await client.query(
        `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2) ON CONFLICT (hash) DO NOTHING`,
        [entry.tag, Date.now()]
      );
    } else {
      throw err;
    }
  }
}

async function applyFiles(client: Client): Promise<void> {
  await ensureMigrationsTable(client);
  const appliedSet = await getAppliedMigrationHashes(client);

  const drizzleDir = path.resolve(import.meta.dirname, "../drizzle");
  const journalPath = path.join(drizzleDir, "meta/_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8")) as { entries: { tag: string }[] };

  await baselinePreExistingMigrations(client, appliedSet, journal.entries);

  for (const entry of journal.entries) {
    if (!appliedSet.has(entry.tag)) {
      await applySingleMigration(client, entry, drizzleDir);
    }
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
