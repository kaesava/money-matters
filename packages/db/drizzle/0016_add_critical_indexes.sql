-- Migration 0014: Add critical indexes, RLS policy on bank_account_category_mappings, user_preferences audit columns, and processed_webhooks table

-- 1. Critical indexes for high-frequency query paths
CREATE INDEX IF NOT EXISTS tenant_users_user_id_idx ON tenant_users (user_id);
CREATE INDEX IF NOT EXISTS tenant_users_invite_token_idx ON tenant_users (invite_token);
CREATE INDEX IF NOT EXISTS tenant_users_invite_email_idx ON tenant_users (invite_email);
CREATE INDEX IF NOT EXISTS categories_tenant_type_idx ON categories (tenant_id, type);
CREATE INDEX IF NOT EXISTS categories_tenant_surplus_idx ON categories (tenant_id, is_surplus_target);
CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories (user_id);
CREATE INDEX IF NOT EXISTS expense_events_tenant_date_status_idx ON expense_events (tenant_id, expected_date, status);
CREATE INDEX IF NOT EXISTS income_events_tenant_date_status_idx ON income_events (tenant_id, expected_date, status);
CREATE INDEX IF NOT EXISTS transaction_ledger_account_idx ON transaction_ledger (bank_account_id);
CREATE INDEX IF NOT EXISTS transaction_ledger_category_idx ON transaction_ledger (category_id);
CREATE INDEX IF NOT EXISTS transaction_ledger_idempotency_idx ON transaction_ledger (idempotency_key);
CREATE INDEX IF NOT EXISTS file_notes_tenant_entity_idx ON file_notes (tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS user_preferences_user_tenant_idx ON user_preferences (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS tenants_stripe_customer_idx ON tenants (stripe_customer_id);

-- 2. Ensure RLS on bank_account_category_mappings
ALTER TABLE bank_account_category_mappings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY bank_account_category_mappings_tenant_isolation ON bank_account_category_mappings
    AS RESTRICTIVE USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Add standard audit columns to user_preferences
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS app_id uuid;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS archived_by uuid;

-- 4. Create processed_webhooks table for Stripe webhook idempotency
CREATE TABLE IF NOT EXISTS processed_webhooks (
  event_id varchar(255) PRIMARY KEY,
  event_type varchar(255) NOT NULL,
  processed_at timestamp DEFAULT now() NOT NULL
);
