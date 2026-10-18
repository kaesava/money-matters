-- Migration 0018: Add bug_reports table and enable tenant isolation RLS
CREATE TABLE IF NOT EXISTS "bug_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "category" varchar(50) DEFAULT 'other' NOT NULL,
  "severity" varchar(20) DEFAULT 'medium' NOT NULL,
  "status" varchar(20) DEFAULT 'open' NOT NULL,
  "app_version" varchar(50) DEFAULT '1.0.0-beta' NOT NULL,
  "platform" varchar(20) NOT NULL,
  "page_url" varchar(512),
  "device_info" text,
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

ALTER TABLE "bug_reports" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bug_reports' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY tenant_isolation ON "bug_reports"
      FOR ALL
      USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
  END IF;
END $$;
