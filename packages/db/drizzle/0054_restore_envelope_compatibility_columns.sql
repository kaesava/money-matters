-- Migration 0054: Restore envelope compatibility columns and synchronize enum types

-- 1. Ensure goal_mode_enum exists
DO $$ BEGIN
  CREATE TYPE "public"."goal_mode_enum" AS ENUM('TARGET_DATE', 'ONGOING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Ensure funding_mode_enum exists
DO $$ BEGIN
  CREATE TYPE "public"."funding_mode_enum" AS ENUM('TARGET_BALANCE', 'RECURRING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Restore compatibility and funding columns on envelopes
ALTER TABLE "envelopes" ADD COLUMN IF NOT EXISTS "funding_mode" "public"."funding_mode_enum" DEFAULT 'TARGET_BALANCE';
ALTER TABLE "envelopes" ADD COLUMN IF NOT EXISTS "goal_mode" "public"."goal_mode_enum" DEFAULT 'TARGET_DATE';
ALTER TABLE "envelopes" ADD COLUMN IF NOT EXISTS "is_priority" boolean DEFAULT false NOT NULL;
ALTER TABLE "envelopes" ADD COLUMN IF NOT EXISTS "is_essential" boolean DEFAULT false NOT NULL;
ALTER TABLE "envelopes" ADD COLUMN IF NOT EXISTS "is_committed" boolean DEFAULT false NOT NULL;

-- 4. Expand envelope_type_enum with legacy and new values for complete interoperability
ALTER TYPE "public"."envelope_type_enum" ADD VALUE IF NOT EXISTS 'BILL';
ALTER TYPE "public"."envelope_type_enum" ADD VALUE IF NOT EXISTS 'GOAL';
ALTER TYPE "public"."envelope_type_enum" ADD VALUE IF NOT EXISTS 'SCHEDULED_BILL';
ALTER TYPE "public"."envelope_type_enum" ADD VALUE IF NOT EXISTS 'FLEXIBLE_BILL';
ALTER TYPE "public"."envelope_type_enum" ADD VALUE IF NOT EXISTS 'TARGET_GOAL';
ALTER TYPE "public"."envelope_type_enum" ADD VALUE IF NOT EXISTS 'ONGOING_GOAL';

-- 5. Expand allocation_step_type_enum with legacy and new values
ALTER TYPE "public"."allocation_step_type_enum" ADD VALUE IF NOT EXISTS 'PRIORITY_BILLS';
ALTER TYPE "public"."allocation_step_type_enum" ADD VALUE IF NOT EXISTS 'STANDARD_BILLS';
ALTER TYPE "public"."allocation_step_type_enum" ADD VALUE IF NOT EXISTS 'PRIORITY_GOALS';
ALTER TYPE "public"."allocation_step_type_enum" ADD VALUE IF NOT EXISTS 'ESSENTIAL_BILLS';
ALTER TYPE "public"."allocation_step_type_enum" ADD VALUE IF NOT EXISTS 'FLEXIBLE_BILLS';
ALTER TYPE "public"."allocation_step_type_enum" ADD VALUE IF NOT EXISTS 'COMMITTED_GOALS';

-- 6. Backfill goal_mode
UPDATE "envelopes"
SET "goal_mode" = CASE
  WHEN "envelope_type"::text = 'ONGOING_GOAL' OR "funding_mode"::text = 'RECURRING' THEN 'ONGOING'::"public"."goal_mode_enum"
  ELSE 'TARGET_DATE'::"public"."goal_mode_enum"
END
WHERE "goal_mode" IS NULL OR "goal_mode" = 'TARGET_DATE';

-- 7. Backfill is_essential & is_committed from is_priority
UPDATE "envelopes"
SET "is_essential" = "is_priority",
    "is_committed" = "is_priority"
WHERE "is_priority" = true;

-- 8. Backfill last_burst_date on income_sources and envelopes from existing unarchived events
UPDATE "income_sources" s
SET "last_burst_date" = sub.max_date
FROM (
  SELECT "income_source_id", MAX("expected_date") as max_date
  FROM "income_events"
  WHERE "archived_at" IS NULL
  GROUP BY "income_source_id"
) sub
WHERE s."id" = sub."income_source_id" AND s."last_burst_date" IS NULL;

UPDATE "envelopes" env
SET "last_burst_date" = sub.max_date
FROM (
  SELECT "envelope_id", MAX("expected_date") as max_date
  FROM "expense_events"
  WHERE "archived_at" IS NULL
  GROUP BY "envelope_id"
) sub
WHERE env."id" = sub."envelope_id" AND env."last_burst_date" IS NULL;
