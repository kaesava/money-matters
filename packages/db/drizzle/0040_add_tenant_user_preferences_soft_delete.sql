-- 0040_add_tenant_user_preferences_soft_delete.sql
-- Add soft-delete audit columns archived_at and archived_by to tenant_user_preferences

ALTER TABLE "tenant_user_preferences" 
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "archived_by" uuid;
