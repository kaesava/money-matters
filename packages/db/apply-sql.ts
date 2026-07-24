import { neon } from "@neondatabase/serverless";

async function applySql() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = neon(dbUrl);

  console.log("Applying DDL updates...");
  await sql`ALTER TABLE tenants DROP COLUMN IF EXISTS default_surplus_category_id`;
  await sql`ALTER TABLE bank_accounts DROP COLUMN IF EXISTS purpose`;
  await sql`ALTER TABLE bank_accounts DROP COLUMN IF EXISTS is_offset`;
  await sql`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS unbudgeted_buffer numeric(12, 2) DEFAULT '0.00' NOT NULL`;
  await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS budget_frequency varchar(20) DEFAULT 'MONTHLY'`;
  await sql`ALTER TABLE transaction_ledger ADD COLUMN IF NOT EXISTS transfer_group_id uuid`;
  await sql`DROP TYPE IF EXISTS account_purpose_enum`;
  console.log("DDL updates applied successfully!");
  process.exit(0);
}

applySql().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
