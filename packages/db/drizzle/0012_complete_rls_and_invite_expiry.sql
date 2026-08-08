-- Migration 0012: Add expires_at to tenant_users and enable RLS on missing tables

-- 1. Add expires_at column to tenant_users table for invitation token expiry
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;

-- 2. user_preferences RLS isolation policy
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY tenant_isolation ON "user_preferences"
      FOR ALL
      USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
  END IF;
END $$;

-- 3. expense_events RLS isolation policy (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_events') THEN
    ALTER TABLE "expense_events" ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'expense_events' AND policyname = 'tenant_isolation'
    ) THEN
      CREATE POLICY tenant_isolation ON "expense_events"
        FOR ALL
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
    END IF;
  END IF;
END $$;

-- 4. expense_sources RLS isolation policy (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_sources') THEN
    ALTER TABLE "expense_sources" ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'expense_sources' AND policyname = 'tenant_isolation'
    ) THEN
      CREATE POLICY tenant_isolation ON "expense_sources"
        FOR ALL
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
    END IF;
  END IF;
END $$;
