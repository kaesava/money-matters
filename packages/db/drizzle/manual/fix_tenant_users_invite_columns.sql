-- Run this directly against the database to add missing invite columns to tenant_users.
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS.

ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invite_email" varchar(255);
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invite_token" uuid;
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invited_at" timestamptz;

-- Note: invite_status uses invite_status_enum which should already exist.
-- If invite_status column doesn't exist, run:
-- ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invite_status" "invite_status_enum" NOT NULL DEFAULT 'ACCEPTED';
