-- Migration 0057: Enforce partial unique index on active scheduled expense_events for burst idempotency
CREATE UNIQUE INDEX IF NOT EXISTS "expense_events_scheduled_unique_idx"
  ON "expense_events" ("tenant_id", "envelope_id", "expected_date")
  WHERE "is_scheduled" = true AND "archived_at" IS NULL;
