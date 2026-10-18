-- Migration 0019: Add frustration_level and contact_consent columns to bug_reports
ALTER TABLE "bug_reports" ADD COLUMN IF NOT EXISTS "frustration_level" integer DEFAULT 2 NOT NULL;
ALTER TABLE "bug_reports" ADD COLUMN IF NOT EXISTS "contact_consent" boolean DEFAULT true NOT NULL;
