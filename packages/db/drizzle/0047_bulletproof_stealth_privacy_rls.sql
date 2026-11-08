-- Migration 0047: Bulletproof Stealth Privacy RLS across bank accounts, envelopes, income, expenses, transfers, plans, and ledger

DO $$
BEGIN
  -- 1. Synchronize any envelopes linked to private bank accounts
  UPDATE envelopes SET is_private = true, user_id = ba.user_id 
  FROM bank_accounts ba 
  WHERE envelopes.bank_account_id = ba.id 
    AND ba.is_private = true 
    AND (envelopes.is_private = false OR envelopes.user_id IS NULL);

  -- 2. bank_accounts stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON bank_accounts;
  CREATE POLICY stealth_privacy_isolation ON bank_accounts
    AS RESTRICTIVE FOR ALL
    USING (
      is_private = false OR 
      (user_id IS NOT NULL AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
    );

  -- 3. envelopes stealth privacy isolation policy (checks envelope privacy and linked bank account visibility)
  DROP POLICY IF EXISTS stealth_privacy_isolation ON envelopes;
  CREATE POLICY stealth_privacy_isolation ON envelopes
    AS RESTRICTIVE FOR ALL
    USING (
      (
        is_private = false OR 
        (user_id IS NOT NULL AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      )
      AND (
        bank_account_id IS NULL OR 
        EXISTS (
          SELECT 1 FROM bank_accounts ba
          WHERE ba.id = envelopes.bank_account_id
        )
      )
    );

  -- 4. income_sources stealth privacy isolation policy (checks receiving account visibility)
  DROP POLICY IF EXISTS stealth_privacy_isolation ON income_sources;
  CREATE POLICY stealth_privacy_isolation ON income_sources
    AS RESTRICTIVE FOR ALL
    USING (
      receiving_account_id IS NULL OR
      EXISTS (
        SELECT 1 FROM bank_accounts ba 
        WHERE ba.id = income_sources.receiving_account_id
      )
    );

  -- 5. transaction_ledger stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON transaction_ledger;
  CREATE POLICY stealth_privacy_isolation ON transaction_ledger
    AS RESTRICTIVE FOR ALL
    USING (
      (
        bank_account_id IS NULL OR 
        EXISTS (
          SELECT 1 FROM bank_accounts ba 
          WHERE ba.id = transaction_ledger.bank_account_id
        )
      )
      AND (
        envelope_id IS NULL OR 
        EXISTS (
          SELECT 1 FROM envelopes env 
          WHERE env.id = transaction_ledger.envelope_id
        )
      )
    );

  -- 6. income_events stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON income_events;
  CREATE POLICY stealth_privacy_isolation ON income_events
    AS RESTRICTIVE FOR ALL
    USING (
      (
        income_source_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM income_sources inc
          WHERE inc.id = income_events.income_source_id
        )
      )
      OR
      (
        income_source_id IS NULL AND
        (created_by IS NULL OR created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      )
    );

  -- 7. expense_events stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON expense_events;
  CREATE POLICY stealth_privacy_isolation ON expense_events
    AS RESTRICTIVE FOR ALL
    USING (
      envelope_id IS NULL OR
      EXISTS (
        SELECT 1 FROM envelopes env
        WHERE env.id = expense_events.envelope_id
      )
    );

  -- 8. transfer_events stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON transfer_events;
  CREATE POLICY stealth_privacy_isolation ON transfer_events
    AS RESTRICTIVE FOR ALL
    USING (
      (
        source_envelope_id IS NULL OR 
        EXISTS (
          SELECT 1 FROM envelopes env 
          WHERE env.id = transfer_events.source_envelope_id
        )
      )
      AND (
        destination_envelope_id IS NULL OR 
        EXISTS (
          SELECT 1 FROM envelopes env 
          WHERE env.id = transfer_events.destination_envelope_id
        )
      )
    );

  -- 9. allocation_plans stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON allocation_plans;
  CREATE POLICY stealth_privacy_isolation ON allocation_plans
    AS RESTRICTIVE FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM income_events ie
        WHERE ie.id = allocation_plans.income_event_id
      )
    );

  -- 10. allocation_plan_lines stealth privacy isolation policy
  DROP POLICY IF EXISTS stealth_privacy_isolation ON allocation_plan_lines;
  CREATE POLICY stealth_privacy_isolation ON allocation_plan_lines
    AS RESTRICTIVE FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM envelopes env
        WHERE env.id = allocation_plan_lines.envelope_id
      )
    );
END $$;
