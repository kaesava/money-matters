-- Migration 0020: Add Stealth Privacy RLS policies on categories and bank_accounts
DO $$
BEGIN
  -- categories stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON categories;
  CREATE POLICY stealth_privacy_isolation ON categories
    AS RESTRICTIVE FOR ALL
    USING (
      is_private = false OR 
      user_id IS NULL OR 
      user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    );

  -- bank_accounts stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON bank_accounts;
  CREATE POLICY stealth_privacy_isolation ON bank_accounts
    AS RESTRICTIVE FOR ALL
    USING (
      is_private = false OR 
      user_id IS NULL OR 
      user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    );
END $$;
