-- Migration 0031: Consolidate envelopes amounts/dates and cull transfer_sources
-- Option B: Radical Consolidation - No Fallback Gymnastics

-- 1. Consolidate envelope living allowance into monthly_amount
UPDATE "envelopes"
SET "monthly_amount" = "everyday_allowance_amount"
WHERE "monthly_amount" IS NULL AND "everyday_allowance_amount" IS NOT NULL;

-- 2. Consolidate envelope target_date into end_date
UPDATE "envelopes"
SET "end_date" = "target_date"
WHERE "end_date" IS NULL AND "target_date" IS NOT NULL;

-- 3. Drop culled columns from envelopes
ALTER TABLE "envelopes" DROP COLUMN IF EXISTS "everyday_allowance_amount";
ALTER TABLE "envelopes" DROP COLUMN IF EXISTS "target_date";
ALTER TABLE "envelopes" DROP COLUMN IF EXISTS "icon";

-- 4. Drop transfer_source_id from transfer_events
ALTER TABLE "transfer_events" DROP CONSTRAINT IF EXISTS "transfer_events_transfer_source_id_transfer_sources_id_fk";
ALTER TABLE "transfer_events" DROP COLUMN IF EXISTS "transfer_source_id";

-- 5. Drop transfer_sources table completely
DROP TABLE IF EXISTS "transfer_sources" CASCADE;
