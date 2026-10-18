-- Migration: Remove redundant household_id columns which have been unified under tenant_id
ALTER TABLE "categories" DROP COLUMN IF EXISTS "household_id";
ALTER TABLE "bank_accounts" DROP COLUMN IF EXISTS "household_id";
ALTER TABLE "income_sources" DROP COLUMN IF EXISTS "household_id";
