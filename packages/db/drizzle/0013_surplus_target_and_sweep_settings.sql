-- Migration 0013: Add is_surplus_target, is_essential, and tenant sweep settings
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "is_surplus_target" boolean DEFAULT false NOT NULL;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "is_essential" boolean DEFAULT false NOT NULL;
ALTER TABLE "app_categories" ADD COLUMN IF NOT EXISTS "is_surplus_target" boolean DEFAULT false NOT NULL;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "sweep_everyday_leftover" boolean DEFAULT true NOT NULL;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "last_sweep_processed_month" varchar(7);
