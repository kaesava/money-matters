-- Migration 0053: Unified two-mode envelope funding architecture and strategy steps

-- 1. Create funding_mode_enum if not exists
DO $$ BEGIN
  CREATE TYPE "public"."funding_mode_enum" AS ENUM('TARGET_BALANCE', 'RECURRING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Envelope type enum migration: create new enum, convert column, drop old enum
DO $$ BEGIN
  CREATE TYPE "public"."envelope_type_enum_new" AS ENUM('EVERYDAY', 'BILL', 'GOAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns if not present
ALTER TABLE "envelopes" ADD COLUMN IF NOT EXISTS "funding_mode" "funding_mode_enum" DEFAULT 'TARGET_BALANCE';
ALTER TABLE "envelopes" ADD COLUMN IF NOT EXISTS "is_priority" boolean DEFAULT false NOT NULL;

-- Backfill data
DO $$ BEGIN
  -- Backfill funding_mode based on old types if old columns existed
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'envelopes' AND column_name = 'is_essential') THEN
    UPDATE "envelopes"
    SET "is_priority" = COALESCE("is_essential", false) OR COALESCE("is_committed", false);
  END IF;
END $$;

-- Safely convert envelope_type column if old enum is in use
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'envelope_type_enum' AND e.enumlabel = 'SCHEDULED_BILL'
  ) THEN
    ALTER TABLE "envelopes" ALTER COLUMN "envelope_type" DROP DEFAULT;
    ALTER TABLE "envelopes" ALTER COLUMN "envelope_type" TYPE "public"."envelope_type_enum_new"
      USING (
        CASE
          WHEN "envelope_type"::text IN ('SCHEDULED_BILL', 'FLEXIBLE_BILL') THEN 'BILL'::"public"."envelope_type_enum_new"
          WHEN "envelope_type"::text IN ('TARGET_GOAL', 'ONGOING_GOAL') THEN 'GOAL'::"public"."envelope_type_enum_new"
          ELSE 'EVERYDAY'::"public"."envelope_type_enum_new"
        END
      );
    DROP TYPE "public"."envelope_type_enum";
    ALTER TYPE "public"."envelope_type_enum_new" RENAME TO "envelope_type_enum";
  END IF;
END $$;

-- Drop obsolete columns if they exist
ALTER TABLE "envelopes" DROP COLUMN IF EXISTS "goal_mode";
ALTER TABLE "envelopes" DROP COLUMN IF EXISTS "is_essential";
ALTER TABLE "envelopes" DROP COLUMN IF EXISTS "is_committed";
DROP TYPE IF EXISTS "public"."goal_mode_enum";

-- Safely convert allocation_step_type_enum
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'allocation_step_type_enum' AND e.enumlabel = 'ESSENTIAL_BILLS'
  ) THEN
    CREATE TYPE "public"."allocation_step_type_enum_new" AS ENUM(
      'IMMEDIATE_BILLS',
      'DEFICIT_REPAIR',
      'BILLS_SAFETY_FLOOR',
      'PRO_RATA_BILLS',
      'EVERYDAY_ALLOWANCE',
      'PRIORITY_BILLS',
      'STANDARD_BILLS',
      'PRIORITY_GOALS',
      'STANDARD_GOALS',
      'FIXED_AMOUNT',
      'PERCENTAGE_SPLIT',
      'SURPLUS_SWEEP'
    );

    ALTER TABLE "allocation_strategy_steps" ALTER COLUMN "step_type" TYPE "public"."allocation_step_type_enum_new"
      USING (
        CASE
          WHEN "step_type"::text = 'ESSENTIAL_BILLS' THEN 'PRIORITY_BILLS'::"public"."allocation_step_type_enum_new"
          WHEN "step_type"::text = 'FLEXIBLE_BILLS' THEN 'STANDARD_BILLS'::"public"."allocation_step_type_enum_new"
          WHEN "step_type"::text = 'COMMITTED_GOALS' THEN 'PRIORITY_GOALS'::"public"."allocation_step_type_enum_new"
          WHEN "step_type"::text = 'STANDARD_GOALS' THEN 'STANDARD_GOALS'::"public"."allocation_step_type_enum_new"
          ELSE "step_type"::text::"public"."allocation_step_type_enum_new"
        END
      );
    DROP TYPE "public"."allocation_step_type_enum";
    ALTER TYPE "public"."allocation_step_type_enum_new" RENAME TO "allocation_step_type_enum";
  END IF;
END $$;
