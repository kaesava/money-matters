-- Migration 0008: Add missing partner invite columns to tenant_users
DO $$ BEGIN
  CREATE TYPE "invite_status_enum" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invite_email" varchar(255);
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invite_token" uuid;
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invite_status" "invite_status_enum" NOT NULL DEFAULT 'ACCEPTED';
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invited_at" timestamptz;
