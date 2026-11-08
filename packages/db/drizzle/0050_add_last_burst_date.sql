ALTER TABLE "income_sources" ADD COLUMN IF NOT EXISTS "last_burst_date" date;
ALTER TABLE "envelopes" ADD COLUMN IF NOT EXISTS "last_burst_date" date;

-- Backfill last_burst_date for existing active income sources from their max unarchived expected_date
UPDATE "income_sources"
SET "last_burst_date" = (
  SELECT MAX(ie.expected_date)
  FROM "income_events" ie
  WHERE ie.income_source_id = "income_sources".id
    AND ie.archived_at IS NULL
)
WHERE "last_burst_date" IS NULL;

-- Backfill last_burst_date for existing active scheduled bill envelopes from their max unarchived expected_date
UPDATE "envelopes"
SET "last_burst_date" = (
  SELECT MAX(ee.expected_date)
  FROM "expense_events" ee
  WHERE ee.envelope_id = "envelopes".id
    AND ee.is_scheduled = true
    AND ee.archived_at IS NULL
)
WHERE "last_burst_date" IS NULL
  AND "envelope_type" = 'SCHEDULED_BILL'
  AND "generate_events" = true;
