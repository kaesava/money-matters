-- Migration 0045: Harden Stealth Privacy RLS across bank accounts, envelopes, income, expenses, transfers, plans, and ledger

DO $$
BEGIN
  -- 1. bank_accounts stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON bank_accounts;
  CREATE POLICY stealth_privacy_isolation ON bank_accounts
    AS RESTRICTIVE FOR ALL
    USING (
      is_private = false OR 
      (user_id IS NOT NULL AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
    );

  -- 2. envelopes stealth privacy isolation policy (checks envelope privacy and linked bank account privacy)
  DROP POLICY IF EXISTS stealth_privacy_isolation ON envelopes;
  CREATE POLICY stealth_privacy_isolation ON envelopes
    AS RESTRICTIVE FOR ALL
    USING (
      (
        is_private = false OR 
        (user_id IS NOT NULL AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      )
      AND NOT EXISTS (
        SELECT 1 FROM bank_accounts ba
        WHERE ba.id = envelopes.bank_account_id
          AND ba.is_private = true
          AND (ba.user_id IS NULL OR ba.user_id != NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      )
    );

  -- 3. income_sources stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON income_sources;
  CREATE POLICY stealth_privacy_isolation ON income_sources
    AS RESTRICTIVE FOR ALL
    USING (
      NOT EXISTS (
        SELECT 1 FROM bank_accounts ba 
        WHERE ba.id = income_sources.receiving_account_id 
          AND ba.is_private = true 
          AND (ba.user_id IS NULL OR ba.user_id != NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      )
    );

  -- 4. transaction_ledger stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON transaction_ledger;
  CREATE POLICY stealth_privacy_isolation ON transaction_ledger
    AS RESTRICTIVE FOR ALL
    USING (
      NOT EXISTS (
        SELECT 1 FROM bank_accounts ba 
        WHERE ba.id = transaction_ledger.bank_account_id 
          AND ba.is_private = true 
          AND (ba.user_id IS NULL OR ba.user_id != NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      )
      AND NOT EXISTS (
        SELECT 1 FROM envelopes env 
        WHERE env.id = transaction_ledger.envelope_id 
          AND (
            (env.is_private = true AND (env.user_id IS NULL OR env.user_id != NULLIF(current_setting('app.current_user_id', true), '')::uuid))
            OR EXISTS (
              SELECT 1 FROM bank_accounts ba
              WHERE ba.id = env.bank_account_id
                AND ba.is_private = true
                AND (ba.user_id IS NULL OR ba.user_id != NULLIF(current_setting('app.current_user_id', true), '')::uuid)
            )
          )
      )
    );

  -- 5. income_events stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON income_events;
  CREATE POLICY stealth_privacy_isolation ON income_events
    AS RESTRICTIVE FOR ALL
    USING (
      NOT EXISTS (
        SELECT 1 FROM income_sources inc
        JOIN bank_accounts ba ON ba.id = inc.receiving_account_id
        WHERE inc.id = income_events.income_source_id
          AND ba.is_private = true
          AND (ba.user_id IS NULL OR ba.user_id != NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      )
    );

  -- 6. expense_events stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON expense_events;
  CREATE POLICY stealth_privacy_isolation ON expense_events
    AS RESTRICTIVE FOR ALL
    USING (
      NOT EXISTS (
        SELECT 1 FROM envelopes env
        WHERE env.id = expense_events.envelope_id
          AND (
            (env.is_private = true AND (env.user_id IS NULL OR env.user_id != NULLIF(current_setting('app.current_user_id', true), '')::uuid))
            OR EXISTS (
              SELECT 1 FROM bank_accounts ba
              WHERE ba.id = env.bank_account_id
                AND ba.is_private = true
                AND (ba.user_id IS NULL OR ba.user_id != NULLIF(current_setting('app.current_user_id', true), '')::uuid)
            )
          )
      )
    );

  -- 7. transfer_events stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON transfer_events;
  CREATE POLICY stealth_privacy_isolation ON transfer_events
    AS RESTRICTIVE FOR ALL
    USING (
      NOT EXISTS (
        SELECT 1 FROM envelopes env
        WHERE (env.id = transfer_events.source_envelope_id OR env.id = transfer_events.destination_envelope_id)
          AND (
            (env.is_private = true AND (env.user_id IS NULL OR env.user_id != NULLIF(current_setting('app.current_user_id', true), '')::uuid))
            OR EXISTS (
              SELECT 1 FROM bank_accounts ba
              WHERE ba.id = env.bank_account_id
                AND ba.is_private = true
                AND (ba.user_id IS NULL OR ba.user_id != NULLIF(current_setting('app.current_user_id', true), '')::uuid)
            )
          )
      )
    );

  -- 8. allocation_plans stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON allocation_plans;
  CREATE POLICY stealth_privacy_isolation ON allocation_plans
    AS RESTRICTIVE FOR ALL
    USING (
      NOT EXISTS (
        SELECT 1 FROM income_events ie
        JOIN income_sources inc ON inc.id = ie.income_source_id
        JOIN bank_accounts ba ON ba.id = inc.receiving_account_id
        WHERE ie.id = allocation_plans.income_event_id
          AND ba.is_private = true
          AND (ba.user_id IS NULL OR ba.user_id != NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      )
    );

  -- 9. allocation_plan_lines stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON allocation_plan_lines;
  CREATE POLICY stealth_privacy_isolation ON allocation_plan_lines
    AS RESTRICTIVE FOR ALL
    USING (
      NOT EXISTS (
        SELECT 1 FROM envelopes env
        WHERE env.id = allocation_plan_lines.envelope_id
          AND (
            (env.is_private = true AND (env.user_id IS NULL OR env.user_id != NULLIF(current_setting('app.current_user_id', true), '')::uuid))
            OR EXISTS (
              SELECT 1 FROM bank_accounts ba
              WHERE ba.id = env.bank_account_id
                AND ba.is_private = true
                AND (ba.user_id IS NULL OR ba.user_id != NULLIF(current_setting('app.current_user_id', true), '')::uuid)
            )
          )
      )
    );
END $$;
