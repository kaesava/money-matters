/* global process, console */
const { Client } = require("@neondatabase/serverless");

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Connected to Neon DB!");

  await client.query("ALTER TABLE tenants DROP COLUMN IF EXISTS default_surplus_category_id");
  await client.query("ALTER TABLE bank_accounts DROP COLUMN IF EXISTS purpose");
  await client.query("ALTER TABLE bank_accounts DROP COLUMN IF EXISTS is_offset");
  await client.query("ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS unbudgeted_buffer numeric(12, 2) DEFAULT '0.00' NOT NULL");
  await client.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_surplus_target boolean DEFAULT false NOT NULL");
  await client.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_essential boolean DEFAULT false NOT NULL");
  await client.query("ALTER TABLE app_categories ADD COLUMN IF NOT EXISTS is_surplus_target boolean DEFAULT false NOT NULL");
  await client.query("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sweep_everyday_leftover boolean DEFAULT true NOT NULL");
  await client.query("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_sweep_processed_month varchar(7)");
  await client.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS budget_frequency varchar(20) DEFAULT 'MONTHLY'");
  await client.query("ALTER TABLE transaction_ledger ADD COLUMN IF NOT EXISTS transfer_group_id uuid");
  await client.query("DROP TYPE IF EXISTS account_purpose_enum");


  await client.end();
  console.log("SUCCESS!");
}

run().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
