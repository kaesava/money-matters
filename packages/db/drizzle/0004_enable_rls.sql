-- Enable RLS and create tenant isolation policies

-- 1. tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenants
  FOR ALL
  USING (id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 2. tenant_users
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenant_users
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 3. bank_accounts
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bank_accounts
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 4. income_sources
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON income_sources
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 5. income_source_schedules
ALTER TABLE income_source_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON income_source_schedules
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 6. income_events
ALTER TABLE income_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON income_events
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 7. allocation_plans
ALTER TABLE allocation_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON allocation_plans
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 8. allocation_plan_lines
ALTER TABLE allocation_plan_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON allocation_plan_lines
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 9. categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON categories
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 10. category_schedules
ALTER TABLE category_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON category_schedules
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 11. transaction_ledger
ALTER TABLE transaction_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON transaction_ledger
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 12. shortfall_events
ALTER TABLE shortfall_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON shortfall_events
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 13. savings_reconciliations
ALTER TABLE savings_reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON savings_reconciliations
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 14. device_tokens
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON device_tokens
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 15. file_notes
ALTER TABLE file_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON file_notes
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
