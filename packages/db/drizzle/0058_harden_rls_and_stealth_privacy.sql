-- Migration 0058: Harden FORCE ROW LEVEL SECURITY, mm_app grants, and stealth privacy on allocation_strategies

-- 1. file_notes: enforce FORCE RLS and mm_app permissions (SEC-01)
ALTER TABLE "file_notes" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "file_notes" TO mm_app;

-- 2. allocation_strategies: add RESTRICTIVE stealth_privacy_isolation policy (SEC-03)
ALTER TABLE "allocation_strategies" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "allocation_strategies" TO mm_app;

DROP POLICY IF EXISTS stealth_privacy_isolation ON "allocation_strategies";
CREATE POLICY stealth_privacy_isolation ON "allocation_strategies"
  AS RESTRICTIVE FOR ALL
  USING (
    is_private = false
    OR (
      user_id IS NOT NULL
      AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
  )
  WITH CHECK (
    is_private = false
    OR (
      user_id IS NOT NULL
      AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
  );

-- 3. user_preferences: enforce FORCE RLS and mm_app permissions (SEC-03)
ALTER TABLE "user_preferences" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "user_preferences" TO mm_app;
