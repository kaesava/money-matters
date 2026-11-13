-- Migration 0055: Canonical Two-Mode Envelopes and Step Types Consolidation

-- 1. Ensure funding_mode is backfilled on existing envelopes
UPDATE "envelopes"
SET "funding_mode" = CASE
  WHEN "envelope_type"::text IN ('SCHEDULED_BILL') THEN 'RECURRING'::"public"."funding_mode_enum"
  WHEN "envelope_type"::text IN ('FLEXIBLE_BILL') THEN 'TARGET_BALANCE'::"public"."funding_mode_enum"
  WHEN "envelope_type"::text IN ('ONGOING_GOAL') OR "goal_mode"::text = 'ONGOING' THEN 'RECURRING'::"public"."funding_mode_enum"
  ELSE COALESCE("funding_mode", 'TARGET_BALANCE'::"public"."funding_mode_enum")
END
WHERE "funding_mode" IS NULL OR "envelope_type"::text IN ('SCHEDULED_BILL', 'FLEXIBLE_BILL', 'ONGOING_GOAL');

-- 2. Ensure is_priority is backfilled from is_essential or is_committed
UPDATE "envelopes"
SET "is_priority" = true
WHERE "is_priority" = false AND ("is_essential" = true OR "is_committed" = true);

-- 3. Convert legacy envelope_type values to BILL and GOAL
UPDATE "envelopes"
SET "envelope_type" = 'BILL'
WHERE "envelope_type"::text IN ('SCHEDULED_BILL', 'FLEXIBLE_BILL');

UPDATE "envelopes"
SET "envelope_type" = 'GOAL'
WHERE "envelope_type"::text IN ('TARGET_GOAL', 'ONGOING_GOAL');

-- 4. Recreate envelope_type_enum with strictly ('EVERYDAY', 'BILL', 'GOAL')
DO $$ BEGIN
  CREATE TYPE "public"."envelope_type_enum_canonical" AS ENUM('EVERYDAY', 'BILL', 'GOAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "envelopes" ALTER COLUMN "envelope_type" TYPE "public"."envelope_type_enum_canonical"
  USING ("envelope_type"::text::"public"."envelope_type_enum_canonical");

DROP TYPE "public"."envelope_type_enum";
ALTER TYPE "public"."envelope_type_enum_canonical" RENAME TO "envelope_type_enum";

-- 5. Drop obsolete columns from envelopes
ALTER TABLE "envelopes" DROP COLUMN IF EXISTS "goal_mode";
ALTER TABLE "envelopes" DROP COLUMN IF EXISTS "is_essential";
ALTER TABLE "envelopes" DROP COLUMN IF EXISTS "is_committed";
DROP TYPE IF EXISTS "public"."goal_mode_enum";

-- 6. Update allocation_strategy_steps to canonical step types
UPDATE "allocation_strategy_steps" SET "step_type" = 'PRIORITY_BILLS' WHERE "step_type"::text = 'ESSENTIAL_BILLS';
UPDATE "allocation_strategy_steps" SET "step_type" = 'STANDARD_BILLS' WHERE "step_type"::text = 'FLEXIBLE_BILLS';
UPDATE "allocation_strategy_steps" SET "step_type" = 'PRIORITY_GOALS' WHERE "step_type"::text = 'COMMITTED_GOALS';

-- 7. Recreate allocation_step_type_enum strictly with canonical steps
DO $$ BEGIN
  CREATE TYPE "public"."allocation_step_type_enum_canonical" AS ENUM(
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
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "allocation_strategy_steps" ALTER COLUMN "step_type" TYPE "public"."allocation_step_type_enum_canonical"
  USING ("step_type"::text::"public"."allocation_step_type_enum_canonical");

DROP TYPE "public"."allocation_step_type_enum";
ALTER TYPE "public"."allocation_step_type_enum_canonical" RENAME TO "allocation_step_type_enum";
