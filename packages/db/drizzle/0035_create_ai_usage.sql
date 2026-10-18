-- Migration 0033: Create ai_usage table for tracking monthly LLM usage and rate caps per tenant

CREATE TABLE IF NOT EXISTS "ai_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "period_month" date NOT NULL,
  "llm_calls" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "archived_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_usage_tenant_period_idx" ON "ai_usage" ("tenant_id", "period_month");
CREATE INDEX IF NOT EXISTS "ai_usage_tenant_id_idx" ON "ai_usage" ("tenant_id");

-- Enable Row-Level Security (RLS) for tenant isolation
ALTER TABLE "ai_usage" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_tenant_isolation" ON "ai_usage";
CREATE POLICY "ai_usage_tenant_isolation" ON "ai_usage"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

