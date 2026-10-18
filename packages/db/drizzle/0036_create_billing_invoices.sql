-- Migration 0036: Create billing_invoices table with RLS and add grace_period_ends_at to tenants

-- 1. Add grace_period_ends_at to tenants
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "grace_period_ends_at" timestamp with time zone;

-- 2. Create billing_invoices table
CREATE TABLE IF NOT EXISTS "billing_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "stripe_invoice_id" varchar(255) NOT NULL UNIQUE,
  "stripe_customer_id" varchar(255) NOT NULL,
  "stripe_subscription_id" varchar(255),
  "amount_paid" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "currency" varchar(3) DEFAULT 'AUD' NOT NULL,
  "status" varchar(50) NOT NULL,
  "paid_at" timestamp with time zone,
  "period_start" timestamp with time zone,
  "period_end" timestamp with time zone,
  "invoice_pdf_url" varchar(1024),
  "hosted_invoice_url" varchar(1024),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "archived_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "billing_invoices_tenant_id_idx" ON "billing_invoices" ("tenant_id");
CREATE INDEX IF NOT EXISTS "billing_invoices_stripe_invoice_id_idx" ON "billing_invoices" ("stripe_invoice_id");

-- 3. Enable RLS and Tenant Isolation Policy
ALTER TABLE "billing_invoices" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_invoices_tenant_isolation" ON "billing_invoices";
CREATE POLICY "billing_invoices_tenant_isolation" ON "billing_invoices"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
