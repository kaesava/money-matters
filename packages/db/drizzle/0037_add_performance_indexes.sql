-- Migration 0037: Add composite and foreign key performance indexes
-- Addresses DB-006: Missing FK & composite indexes on high-traffic tables

-- 1. transaction_ledger indexes
CREATE INDEX IF NOT EXISTS "transaction_ledger_tenant_recorded_idx" 
  ON "transaction_ledger" ("tenant_id", "recorded_at" DESC);

CREATE INDEX IF NOT EXISTS "transaction_ledger_envelope_id_idx" 
  ON "transaction_ledger" ("envelope_id");

CREATE INDEX IF NOT EXISTS "transaction_ledger_bank_account_id_idx" 
  ON "transaction_ledger" ("bank_account_id");

CREATE INDEX IF NOT EXISTS "transaction_ledger_plan_line_id_idx" 
  ON "transaction_ledger" ("plan_line_id");

-- 2. envelopes indexes
CREATE INDEX IF NOT EXISTS "envelopes_tenant_type_idx" 
  ON "envelopes" ("tenant_id", "envelope_type");

CREATE INDEX IF NOT EXISTS "envelopes_bank_account_id_idx" 
  ON "envelopes" ("bank_account_id");

CREATE INDEX IF NOT EXISTS "envelopes_user_id_idx" 
  ON "envelopes" ("user_id");

-- 3. income_events indexes
CREATE INDEX IF NOT EXISTS "income_events_tenant_expected_date_idx" 
  ON "income_events" ("tenant_id", "expected_date");

CREATE INDEX IF NOT EXISTS "income_events_income_source_id_idx" 
  ON "income_events" ("income_source_id");
