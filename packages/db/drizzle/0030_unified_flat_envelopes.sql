-- Migration 0030: Unified Flat Envelopes Architecture & Stealth Privacy Isolation
DO $$
BEGIN
  -- 1. Create Enums if not exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'envelope_type_enum') THEN
    CREATE TYPE "envelope_type_enum" AS ENUM ('EVERYDAY', 'SCHEDULED_BILL', 'FLEXIBLE_BILL', 'TARGET_GOAL', 'ONGOING_GOAL');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_mode_enum') THEN
    CREATE TYPE "goal_mode_enum" AS ENUM ('TARGET_DATE', 'ONGOING');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'income_type_enum') THEN
    CREATE TYPE "income_type_enum" AS ENUM ('SALARIED', 'IRREGULAR');
  END IF;
END $$;

-- 2. Create Envelopes Table
CREATE TABLE IF NOT EXISTS "envelopes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "envelope_type" "envelope_type_enum" NOT NULL,
  "bank_account_id" uuid NOT NULL REFERENCES "bank_accounts"("id") ON DELETE CASCADE,
  "everyday_allowance_amount" numeric(12, 2),
  "safety_buffer_floor" numeric(12, 2) DEFAULT '0.00',
  "monthly_amount" numeric(12, 2),
  "entered_amount" numeric(12, 2),
  "budget_frequency" varchar(50) DEFAULT 'MONTHLY',
  "start_date" varchar(50),
  "end_date" varchar(50),
  "rrule" varchar(255),
  "goal_mode" "goal_mode_enum" DEFAULT 'TARGET_DATE',
  "target_amount" numeric(12, 2),
  "target_date" varchar(50),
  "is_essential" boolean NOT NULL DEFAULT false,
  "is_committed" boolean NOT NULL DEFAULT false,
  "is_surplus_target" boolean NOT NULL DEFAULT false,
  "is_private" boolean NOT NULL DEFAULT false,
  "user_id" uuid,
  "icon" varchar(100),
  "order_index" integer NOT NULL DEFAULT 0,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" varchar(100) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "archived_at" timestamp with time zone
);

-- 3. Enable RLS and Policies on Envelopes
ALTER TABLE "envelopes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "envelopes";
CREATE POLICY tenant_isolation ON "envelopes"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS stealth_privacy_isolation ON "envelopes";
CREATE POLICY stealth_privacy_isolation ON "envelopes"
  AS RESTRICTIVE FOR ALL
  USING (
    is_private = false OR 
    user_id IS NULL OR 
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  );

-- 4. Update income_sources Table
ALTER TABLE "income_sources" ADD COLUMN IF NOT EXISTS "income_type" "income_type_enum" NOT NULL DEFAULT 'SALARIED';
ALTER TABLE "income_sources" ALTER COLUMN "rrule" DROP NOT NULL;
ALTER TABLE "income_sources" ALTER COLUMN "start_date" DROP NOT NULL;

-- 5. Update transaction_ledger Table
ALTER TABLE "transaction_ledger" ADD COLUMN IF NOT EXISTS "envelope_id" uuid REFERENCES "envelopes"("id") ON DELETE CASCADE;
ALTER TABLE "transaction_ledger" DROP COLUMN IF EXISTS "pool_id";
ALTER TABLE "transaction_ledger" DROP COLUMN IF EXISTS "category_id";

-- 6. Update expense_events Table
ALTER TABLE "expense_events" ADD COLUMN IF NOT EXISTS "envelope_id" uuid REFERENCES "envelopes"("id") ON DELETE CASCADE;
ALTER TABLE "expense_events" DROP COLUMN IF EXISTS "pool_id";
ALTER TABLE "expense_events" DROP COLUMN IF EXISTS "category_id";

-- 7. Update allocation_plan_lines Table
ALTER TABLE "allocation_plan_lines" ADD COLUMN IF NOT EXISTS "envelope_id" uuid REFERENCES "envelopes"("id") ON DELETE CASCADE;
ALTER TABLE "allocation_plan_lines" DROP COLUMN IF EXISTS "pool_id";
ALTER TABLE "allocation_plan_lines" DROP COLUMN IF EXISTS "category_id";

-- 8. Update transfer_sources Table
ALTER TABLE "transfer_sources" ADD COLUMN IF NOT EXISTS "source_envelope_id" uuid NOT NULL REFERENCES "envelopes"("id") ON DELETE CASCADE;
ALTER TABLE "transfer_sources" ADD COLUMN IF NOT EXISTS "destination_envelope_id" uuid NOT NULL REFERENCES "envelopes"("id") ON DELETE CASCADE;
ALTER TABLE "transfer_sources" DROP COLUMN IF EXISTS "source_pool_id";
ALTER TABLE "transfer_sources" DROP COLUMN IF EXISTS "destination_pool_id";

-- 9. Update transfer_events Table
ALTER TABLE "transfer_events" ADD COLUMN IF NOT EXISTS "source_envelope_id" uuid NOT NULL REFERENCES "envelopes"("id") ON DELETE CASCADE;
ALTER TABLE "transfer_events" ADD COLUMN IF NOT EXISTS "destination_envelope_id" uuid NOT NULL REFERENCES "envelopes"("id") ON DELETE CASCADE;
ALTER TABLE "transfer_events" DROP COLUMN IF EXISTS "source_pool_id";
ALTER TABLE "transfer_events" DROP COLUMN IF EXISTS "destination_pool_id";

-- 10. Drop Obsolete Pools and Categories Tables
DROP TABLE IF EXISTS "category_schedules" CASCADE;
DROP TABLE IF EXISTS "categories" CASCADE;
DROP TABLE IF EXISTS "pools" CASCADE;

-- 11. Create Critical Indexes for envelopes
CREATE INDEX IF NOT EXISTS "idx_envelopes_tenant_account" ON "envelopes"("tenant_id", "bank_account_id");
CREATE INDEX IF NOT EXISTS "idx_envelopes_type" ON "envelopes"("tenant_id", "envelope_type");
