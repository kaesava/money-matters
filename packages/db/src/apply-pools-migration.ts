import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

async function run() {
  const isProd = process.argv.includes("--prod");
  const envFile = isProd ? "../../.env" : "../../.env.development";
  dotenv.config({ path: envFile });

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(`DATABASE_URL missing in ${envFile}`);
  }

  console.log(`🚀 Executing pool schema migration on [${isProd ? "PRODUCTION" : "DEVELOPMENT"}]...`);
  const sql = neon(url);

  await sql`
    DO $$ BEGIN
      CREATE TYPE public.pool_type_enum AS ENUM('EVERYDAY', 'REGULAR', 'GOAL');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE public.rollover_rule_enum AS ENUM('ROLLOVER', 'SWEEP', 'RESET');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS public.pools (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      app_id uuid NOT NULL REFERENCES public.apps(id),
      bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
      name text NOT NULL,
      pool_type public.pool_type_enum NOT NULL,
      target_amount numeric(12, 2) DEFAULT '0.00',
      target_date text,
      everyday_allowance_amount numeric(12, 2) DEFAULT '0.00',
      rollover_rule public.rollover_rule_enum DEFAULT 'ROLLOVER',
      is_committed boolean DEFAULT false NOT NULL,
      is_surplus_target boolean DEFAULT false NOT NULL,
      waterfall_priority integer DEFAULT 50 NOT NULL,
      icon text,
      colour text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      created_by uuid NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_by uuid NOT NULL,
      archived_at timestamp with time zone,
      archived_by uuid
    );
  `;

  await sql`
    ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS archived_by uuid;
  `;

  await sql`
    ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS rollover_rule public.rollover_rule_enum DEFAULT 'ROLLOVER';
  `;

  await sql`
    ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS icon text;
  `;

  await sql`
    ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS colour text;
  `;

  await sql`
    ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS pool_id uuid REFERENCES public.pools(id) ON DELETE CASCADE;
  `;

  await sql`
    ALTER TABLE public.categories ALTER COLUMN type DROP NOT NULL;
  `;

  await sql`
    ALTER TABLE public.allocation_plan_lines ADD COLUMN IF NOT EXISTS pool_id uuid REFERENCES public.pools(id) ON DELETE CASCADE;
  `;

  await sql`
    ALTER TABLE public.allocation_plan_lines ALTER COLUMN category_id DROP NOT NULL;
  `;

  await sql`
    ALTER TABLE public.expense_sources ADD COLUMN IF NOT EXISTS pool_id uuid REFERENCES public.pools(id) ON DELETE CASCADE;
  `;

  await sql`
    ALTER TABLE public.transaction_ledger ADD COLUMN IF NOT EXISTS pool_id uuid REFERENCES public.pools(id) ON DELETE SET NULL;
  `;

  await sql`
    ALTER TABLE public.transaction_ledger ALTER COLUMN category_id DROP NOT NULL;
  `;

  console.log(`✅ Schema migration successfully applied to [${isProd ? "PRODUCTION" : "DEVELOPMENT"}]!`);
}

run().catch((err) => {
  console.error("❌ Schema migration failed:", err);
  process.exit(1);
});
