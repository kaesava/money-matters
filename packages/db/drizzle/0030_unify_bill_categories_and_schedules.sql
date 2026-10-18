-- Migration 0028: Unify bill categories and schedules, add goal mode, drop expense_sources

-- 1. Create goal_mode_enum if not exists
DO $$ BEGIN
  CREATE TYPE "goal_mode_enum" AS ENUM('TARGET_DATE', 'ONGOING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add goal_mode to pools
ALTER TABLE "pools" ADD COLUMN IF NOT EXISTS "goal_mode" "goal_mode_enum" DEFAULT 'TARGET_DATE';

-- 3. Add schedule fields to categories
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "start_date" varchar(50);
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "end_date" varchar(50);
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "rrule" varchar(255);

-- 4. Update expense_events: add is_scheduled, backfill from expense_source_id, drop expense_source_id
ALTER TABLE "expense_events" ADD COLUMN IF NOT EXISTS "is_scheduled" boolean DEFAULT false NOT NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_events' AND column_name = 'expense_source_id'
  ) THEN
    UPDATE "expense_events" SET "is_scheduled" = true WHERE "expense_source_id" IS NOT NULL;
  END IF;
END $$;
ALTER TABLE "expense_events" DROP CONSTRAINT IF EXISTS "expense_events_expense_source_id_expense_sources_id_fk";
ALTER TABLE "expense_events" DROP COLUMN IF EXISTS "expense_source_id";

-- 5. Create index on expense_events (tenant_id, category_id, expected_date)
CREATE INDEX IF NOT EXISTS "expense_events_tenant_category_date_idx" ON "expense_events" ("tenant_id", "category_id", "expected_date");

-- 6. Drop expense_sources table
DROP TABLE IF EXISTS "expense_sources" CASCADE;
