-- Migration 0044: Role-Level Security (RLS) Hardening, FORCE RLS, and Event Idempotency Indexes

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mm_app') THEN
    CREATE ROLE mm_app WITH LOGIN NOINHERIT NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO mm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mm_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mm_app;

-- Force RLS on all tenant-scoped tables so table owners/superusers cannot bypass isolation policies
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenant_users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "bank_accounts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "envelopes" FORCE ROW LEVEL SECURITY;
ALTER TABLE "income_sources" FORCE ROW LEVEL SECURITY;
ALTER TABLE "income_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE "expense_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE "transfer_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE "allocation_plans" FORCE ROW LEVEL SECURITY;
ALTER TABLE "allocation_plan_lines" FORCE ROW LEVEL SECURITY;
ALTER TABLE "transaction_ledger" FORCE ROW LEVEL SECURITY;
ALTER TABLE "billing_invoices" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ai_usage" FORCE ROW LEVEL SECURITY;
ALTER TABLE "device_tokens" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenant_user_preferences" FORCE ROW LEVEL SECURITY;

-- Idempotency and Anti-Race Indexes for lazy/cron event materialization
CREATE UNIQUE INDEX IF NOT EXISTS "income_events_source_date_idx" 
  ON "income_events" ("income_source_id", "expected_date") 
  WHERE "archived_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "expense_events_envelope_date_idx" 
  ON "expense_events" ("envelope_id", "expected_date") 
  WHERE "archived_at" IS NULL;
