-- Migration 0049: Add is_private and user_id to allocation_strategies

ALTER TABLE "allocation_strategies" 
  ADD COLUMN IF NOT EXISTS "is_private" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "user_id" uuid;

CREATE INDEX IF NOT EXISTS "allocation_strategies_user_idx" ON "allocation_strategies" ("tenant_id", "user_id");
