-- Migration 0059: Standardize mandatory audit columns and app_id across all domain tables (VAL-02)

-- 1. apps (global catalog table)
ALTER TABLE "apps"
  ADD COLUMN IF NOT EXISTS "created_by" uuid,
  ADD COLUMN IF NOT EXISTS "updated_by" uuid,
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "archived_by" uuid;

-- 2. users (global user table)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "created_by" uuid,
  ADD COLUMN IF NOT EXISTS "updated_by" uuid,
  ADD COLUMN IF NOT EXISTS "archived_by" uuid;

-- 3. user_preferences (global user preferences)
ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "archived_by" uuid;

-- 4. early_access_subscribers (global waitlist table)
ALTER TABLE "early_access_subscribers"
  ADD COLUMN IF NOT EXISTS "created_by" uuid,
  ADD COLUMN IF NOT EXISTS "updated_by" uuid,
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "archived_by" uuid;

-- 5. tenant_users: add app_id backfilled from tenants.app_id
ALTER TABLE "tenant_users"
  ADD COLUMN IF NOT EXISTS "app_id" uuid NOT NULL DEFAULT '01908bde-34bb-7b19-a178-574211bc93aa';

UPDATE "tenant_users" tu
SET "app_id" = t."app_id"
FROM "tenants" t
WHERE tu."tenant_id" = t."id"
  AND tu."app_id" <> t."app_id";

-- 6. ai_usage: add app_id and archived_by
ALTER TABLE "ai_usage"
  ADD COLUMN IF NOT EXISTS "app_id" uuid NOT NULL DEFAULT '01908bde-34bb-7b19-a178-574211bc93aa',
  ADD COLUMN IF NOT EXISTS "archived_by" uuid;

-- 7. billing_invoices: add app_id and archived_by
ALTER TABLE "billing_invoices"
  ADD COLUMN IF NOT EXISTS "app_id" uuid NOT NULL DEFAULT '01908bde-34bb-7b19-a178-574211bc93aa',
  ADD COLUMN IF NOT EXISTS "archived_by" uuid;
