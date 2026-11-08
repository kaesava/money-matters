-- Migration 0046: Flexible Allocation Strategies, Strategy Steps, and Income Contribution Mode

DO $$ BEGIN
  CREATE TYPE "income_contribution_mode_enum" AS ENUM ('FULL', 'PERCENTAGE', 'FIXED_AMOUNT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "allocation_step_type_enum" AS ENUM (
    'IMMEDIATE_BILLS',
    'DEFICIT_REPAIR',
    'BILLS_SAFETY_FLOOR',
    'PRO_RATA_BILLS',
    'EVERYDAY_ALLOWANCE',
    'COMMITTED_GOALS',
    'STANDARD_GOALS',
    'FIXED_AMOUNT',
    'PERCENTAGE_SPLIT',
    'SURPLUS_SWEEP'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Add contribution columns to income_sources
ALTER TABLE "income_sources" 
  ADD COLUMN IF NOT EXISTS "contribution_mode" "income_contribution_mode_enum" NOT NULL DEFAULT 'FULL',
  ADD COLUMN IF NOT EXISTS "contribution_value" numeric(12, 2);

-- 2. Create allocation_strategies table
CREATE TABLE IF NOT EXISTS "allocation_strategies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "preset_key" varchar(50) DEFAULT 'BALANCED' NOT NULL,
  "description" text,
  "is_default" boolean DEFAULT true NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" varchar NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "archived_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "allocation_strategies_tenant_idx" ON "allocation_strategies" ("tenant_id");

-- 3. Create allocation_strategy_steps table
CREATE TABLE IF NOT EXISTS "allocation_strategy_steps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "strategy_id" uuid NOT NULL REFERENCES "allocation_strategies"("id") ON DELETE CASCADE,
  "order_index" integer NOT NULL,
  "step_type" "allocation_step_type_enum" NOT NULL,
  "target_envelope_id" uuid REFERENCES "envelopes"("id") ON DELETE SET NULL,
  "config" jsonb,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" varchar NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "archived_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "allocation_strategy_steps_strategy_idx" ON "allocation_strategy_steps" ("strategy_id", "order_index");
CREATE INDEX IF NOT EXISTS "allocation_strategy_steps_target_env_idx" ON "allocation_strategy_steps" ("target_envelope_id");

-- 4. Enable and FORCE Row-Level Security
ALTER TABLE "allocation_strategies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "allocation_strategies" FORCE ROW LEVEL SECURITY;

ALTER TABLE "allocation_strategy_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "allocation_strategy_steps" FORCE ROW LEVEL SECURITY;

-- 5. Create Tenant Isolation Policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'allocation_strategies' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY tenant_isolation ON "allocation_strategies"
      FOR ALL
      USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'allocation_strategy_steps' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY tenant_isolation ON "allocation_strategy_steps"
      FOR ALL
      USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
  END IF;
END $$;

-- 6. Stealth Privacy Isolation for strategy steps (cannot target or leak private envelopes to other users)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'allocation_strategy_steps' AND policyname = 'stealth_privacy_isolation'
  ) THEN
    CREATE POLICY stealth_privacy_isolation ON "allocation_strategy_steps"
      AS RESTRICTIVE FOR ALL
      USING (
        target_envelope_id IS NULL OR
        NOT EXISTS (
          SELECT 1 FROM envelopes env
          WHERE env.id = allocation_strategy_steps.target_envelope_id
            AND env.is_private = true
            AND (env.user_id IS NULL OR env.user_id != NULLIF(current_setting('app.current_user_id', true), '')::uuid)
        )
      );
  END IF;
END $$;

-- 7. Grant Permissions to mm_app role
GRANT SELECT, INSERT, UPDATE, DELETE ON "allocation_strategies" TO mm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "allocation_strategy_steps" TO mm_app;
