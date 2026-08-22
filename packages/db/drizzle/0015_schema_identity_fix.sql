-- Migration 0015: Schema Identity & Tenant/App Relationship Fix
-- ⚠ DESTRUCTIVE: Wipes all tenant-scoped data. Safe — dev/prod data is dummy only.
-- Run seed.ts immediately after this migration.

BEGIN;

-- ============================================================
-- 0. Ensure canonical apps row exists (idempotent)
-- ============================================================
INSERT INTO apps (id, name, slug, created_at, updated_at)
VALUES (
  '01908bde-34bb-7b19-a178-574211bc93aa',
  'Money Matters',
  'money-matters',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 1. Wipe all data (FK-safe order: children before parents)
-- ============================================================
TRUNCATE TABLE
  transaction_ledger,
  allocation_plan_lines,
  allocation_plans,
  income_events,
  income_sources,
  expense_events,
  expense_sources,
  category_schedules,
  categories,
  bank_account_category_mappings,
  bank_accounts,
  file_notes,
  device_tokens,
  user_preferences,
  tenant_users,
  tenants,
  users
CASCADE;

-- ============================================================
-- 2. Drop ALL existing RLS policies on tenant-scoped tables
--    (eliminates both stale dual-predicate policies from 0000
--     and single-predicate policies from 0003+)
-- ============================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'tenants','tenant_users','bank_accounts','bank_account_category_mappings',
        'categories','category_schedules','income_sources','income_events',
        'allocation_plans','allocation_plan_lines','transaction_ledger',
        'device_tokens','file_notes','user_preferences','expense_sources','expense_events'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Re-create unified tenant-isolation policies (single predicate on tenant_id)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tenant_users','bank_accounts','bank_account_category_mappings',
    'categories','category_schedules','income_sources','income_events',
    'allocation_plans','allocation_plan_lines','transaction_ledger',
    'device_tokens','file_notes','user_preferences','expense_sources','expense_events'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
       CREATE POLICY tenant_isolation ON %I
         AS RESTRICTIVE FOR ALL
         USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid);',
      tbl, tbl
    );
  END LOOP;
END $$;

-- tenants: RLS uses id (the PK is the isolation boundary, not a tenant_id column)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenants
  AS RESTRICTIVE FOR ALL
  USING (id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ============================================================
-- 3. Remove self-referential tenant_id column from tenants
-- ============================================================
ALTER TABLE tenants DROP COLUMN IF EXISTS tenant_id;

-- ============================================================
-- 4. Remove app_id column from tenant_users
-- ============================================================
ALTER TABLE tenant_users DROP COLUMN IF EXISTS app_id;

-- ============================================================
-- 5. Add FK: tenants.app_id → apps.id
-- ============================================================
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_app_id_apps_id_fk;
ALTER TABLE tenants
  ADD CONSTRAINT tenants_app_id_apps_id_fk
  FOREIGN KEY (app_id) REFERENCES apps(id);

-- ============================================================
-- 6. Add FK: user_preferences.user_id → users.id & ensure columns
-- ============================================================
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS app_id uuid;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS archived_by uuid;

ALTER TABLE user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_user_id_users_id_fk;
ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id);

-- ============================================================
-- 7. Validate the NOT VALID FK on tenant_users.user_id
--    (was added as NOT VALID in migration 0002, never validated)
-- ============================================================
ALTER TABLE tenant_users
  VALIDATE CONSTRAINT tenant_users_user_id_users_id_fk;

-- ============================================================
-- 8. CHECK: ACCEPTED memberships must have a non-null user_id
-- ============================================================
ALTER TABLE tenant_users
  DROP CONSTRAINT IF EXISTS tenant_users_accepted_requires_user_id;
ALTER TABLE tenant_users
  ADD CONSTRAINT tenant_users_accepted_requires_user_id
  CHECK (invite_status != 'ACCEPTED' OR user_id IS NOT NULL);

-- ============================================================
-- 9. Partial unique index: prevent duplicate ACCEPTED memberships
--    per (tenant, user) pair
-- ============================================================
DROP INDEX IF EXISTS tenant_users_accepted_unique_idx;
CREATE UNIQUE INDEX tenant_users_accepted_unique_idx
  ON tenant_users (tenant_id, user_id)
  WHERE invite_status = 'ACCEPTED' AND archived_at IS NULL;

-- ============================================================
-- 10. Index: tenants lookup by app_id (for app-scoped queries)
-- ============================================================
DROP INDEX IF EXISTS tenants_app_id_idx;
CREATE INDEX tenants_app_id_idx ON tenants (app_id);

-- ============================================================
-- 11. Drop deprecated stub: income_source_schedules
--     (deprecated, merged into income_sources; stub in schema)
-- ============================================================
DROP TABLE IF EXISTS income_source_schedules CASCADE;

-- ============================================================
-- 12. Drop stale composite indexes that referenced tenant_id on
--     the tenants table or app_id on tenant_users
-- ============================================================
DROP INDEX IF EXISTS tenants_tenant_app_idx;
DROP INDEX IF EXISTS tenant_users_tenant_app_idx;

-- Re-create clean tenant_users composite index (no app_id)
CREATE INDEX IF NOT EXISTS tenant_users_tenant_id_idx
  ON tenant_users (tenant_id);

COMMIT;
