-- Migration 0024: Prune dead tables and columns for 100% MECE zero-dead-code compliance

-- 1. Drop dead / orphaned tables if they exist
DROP TABLE IF EXISTS "app_categories" CASCADE;
DROP TABLE IF EXISTS "app_versions" CASCADE;
DROP TABLE IF EXISTS "bug_reports" CASCADE;
DROP TABLE IF EXISTS "file_notes" CASCADE;
DROP TABLE IF EXISTS "category_schedules" CASCADE;
DROP TABLE IF EXISTS "bank_account_category_mappings" CASCADE;

-- 2. Drop dead columns from tenants
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "fy_end_month_day";

-- 3. Drop dead columns from pools
ALTER TABLE "pools" DROP COLUMN IF EXISTS "waterfall_priority";
ALTER TABLE "pools" DROP COLUMN IF EXISTS "rollover_rule";
ALTER TABLE "pools" DROP COLUMN IF EXISTS "colour";
ALTER TABLE "pools" DROP COLUMN IF EXISTS "icon";

-- 4. Drop dead columns from categories
ALTER TABLE "categories" DROP COLUMN IF EXISTS "colour";

-- 5. Drop dead columns from transfer_sources
ALTER TABLE "transfer_sources" DROP COLUMN IF EXISTS "rrule";
ALTER TABLE "transfer_sources" DROP COLUMN IF EXISTS "end_date";

-- 6. Drop dead columns from transfer_events
ALTER TABLE "transfer_events" DROP COLUMN IF EXISTS "note";
ALTER TABLE "transfer_events" DROP COLUMN IF EXISTS "is_overridden";

-- 7. Drop dead columns from income_events
ALTER TABLE "income_events" DROP COLUMN IF EXISTS "is_overridden";

-- 8. Drop dead columns from expense_events
ALTER TABLE "expense_events" DROP COLUMN IF EXISTS "is_overridden";

-- 9. Drop unused enum types
DROP TYPE IF EXISTS "rollover_rule_enum";
