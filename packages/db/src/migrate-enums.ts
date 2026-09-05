import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../../");

async function migrateDb(envFile: string, label: string) {
  dotenv.config({ path: path.join(rootDir, envFile), override: true });
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(`No DATABASE_URL found for ${label}`);
    return;
  }
  console.log(`\nMigrating enum values for [${label}]...`);
  const sql = neon(dbUrl);

  try {
    // 1. Temporarily cast columns to text to allow modifying enums without constraint errors
    await sql`ALTER TABLE income_events ALTER COLUMN status DROP DEFAULT;`;
    await sql`ALTER TABLE expense_events ALTER COLUMN status DROP DEFAULT;`;

    await sql`ALTER TABLE income_events ALTER COLUMN status TYPE text USING status::text;`;
    await sql`ALTER TABLE expense_events ALTER COLUMN status TYPE text USING status::text;`;

    // 2. Update existing rows from legacy status values
    await sql`UPDATE income_events SET status = 'PENDING' WHERE status = 'UPCOMING';`;
    await sql`UPDATE income_events SET status = 'CONFIRMED' WHERE status = 'PAID';`;
    await sql`UPDATE income_events SET status = 'PENDING' WHERE status NOT IN ('PENDING', 'SKIPPED', 'CONFIRMED');`;

    await sql`UPDATE expense_events SET status = 'PENDING' WHERE status = 'UPCOMING';`;
    await sql`UPDATE expense_events SET status = 'CONFIRMED' WHERE status = 'PAID';`;
    await sql`UPDATE expense_events SET status = 'SKIPPED' WHERE status = 'CANCELLED';`;
    await sql`UPDATE expense_events SET status = 'PENDING' WHERE status NOT IN ('PENDING', 'SKIPPED', 'CONFIRMED');`;

    // 3. Drop old enum types if they exist
    await sql`DROP TYPE IF EXISTS income_event_status_enum CASCADE;`;
    await sql`DROP TYPE IF EXISTS expense_event_status_enum CASCADE;`;

    // 4. Recreate enum types with exact new values
    await sql`CREATE TYPE income_event_status_enum AS ENUM ('PENDING', 'SKIPPED', 'CONFIRMED');`;
    await sql`CREATE TYPE expense_event_status_enum AS ENUM ('PENDING', 'SKIPPED', 'CONFIRMED');`;

    // 5. Cast columns back to the new enum type with default 'PENDING'
    await sql`ALTER TABLE income_events ALTER COLUMN status TYPE income_event_status_enum USING status::income_event_status_enum;`;
    await sql`ALTER TABLE income_events ALTER COLUMN status SET DEFAULT 'PENDING'::income_event_status_enum;`;

    await sql`ALTER TABLE expense_events ALTER COLUMN status TYPE expense_event_status_enum USING status::expense_event_status_enum;`;
    await sql`ALTER TABLE expense_events ALTER COLUMN status SET DEFAULT 'PENDING'::expense_event_status_enum;`;

    console.log(`✔ Successfully migrated enum values for [${label}]!`);
  } catch (err) {
    console.error(`Error migrating [${label}]:`, err);
    throw err;
  }
}

async function run() {
  const targetEnv = process.argv[2] || "all";
  if (targetEnv === "dev" || targetEnv === "all") {
    await migrateDb(".env.development", "development");
  }
  if (targetEnv === "prod" || targetEnv === "all") {
    await migrateDb(".env", "production");
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
