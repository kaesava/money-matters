-- Migration 0041: Add last_balance_matched_at to bank_accounts, emoji & color_key to envelopes, convert CREDIT_CARD to EVERYDAY

-- 1. Add last_balance_matched_at to bank_accounts
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "last_balance_matched_at" timestamp with time zone;

-- 2. Add emoji and color_key to envelopes
ALTER TABLE "envelopes" ADD COLUMN IF NOT EXISTS "emoji" varchar(16);
ALTER TABLE "envelopes" ADD COLUMN IF NOT EXISTS "color_key" varchar(30);

-- 3. Convert any existing CREDIT_CARD accounts to EVERYDAY
UPDATE "bank_accounts" SET "account_type" = 'EVERYDAY' WHERE "account_type"::text = 'CREDIT_CARD';
