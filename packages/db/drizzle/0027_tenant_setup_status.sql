-- Migration 0025: Add setup_completed_at and setup_status to tenants table with backfill from tenant_user_preferences

-- 1. Add columns to tenants
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "setup_completed_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "setup_status" varchar(30) NOT NULL DEFAULT 'PENDING';

-- 2. Backfill existing tenants from tenant_user_preferences if setup was completed by any member
UPDATE "tenants" t
SET 
  "setup_status" = 'COMPLETED',
  "setup_completed_at" = COALESCE(
    (
      SELECT (app_preferences->'01908bde-34bb-7b19-a178-574211bc93aa'->>'setup_completed_at')::timestamp with time zone
      FROM "tenant_user_preferences" tup
      WHERE tup.tenant_id = t.id AND (tup.app_preferences->'01908bde-34bb-7b19-a178-574211bc93aa'->>'setup_completed')::boolean = true
      LIMIT 1
    ),
    (
      SELECT (app_preferences->'money-matters'->>'setup_completed_at')::timestamp with time zone
      FROM "tenant_user_preferences" tup
      WHERE tup.tenant_id = t.id AND (tup.app_preferences->'money-matters'->>'setup_completed')::boolean = true
      LIMIT 1
    ),
    t.created_at
  )
WHERE EXISTS (
  SELECT 1 FROM "tenant_user_preferences" tup
  WHERE tup.tenant_id = t.id AND (
    (tup.app_preferences->'01908bde-34bb-7b19-a178-574211bc93aa'->>'setup_completed')::boolean = true
    OR (tup.app_preferences->'money-matters'->>'setup_completed')::boolean = true
  )
);
