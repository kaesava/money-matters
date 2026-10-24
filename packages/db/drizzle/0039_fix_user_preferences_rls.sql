-- 0039_fix_user_preferences_rls.sql
-- Drop obsolete tenant-level isolation policy on user_preferences (since tenant_id was dropped in 0018)
-- and add a user-scoped policy checking app.current_user_id.

DROP POLICY IF EXISTS "tenant_isolation_policy" ON "user_preferences";
DROP POLICY IF EXISTS "user_preferences_tenant_isolation" ON "user_preferences";

CREATE POLICY "user_preferences_user_isolation" ON "user_preferences"
  FOR ALL
  USING (
    "user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    "user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    OR current_setting('app.bypass_rls', true) = 'true'
  );
