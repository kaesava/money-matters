-- Migration 0032: Add account_type_enum and account_type column to bank_accounts

DO $$ BEGIN
  CREATE TYPE "account_type_enum" AS ENUM ('CREDIT_CARD', 'EVERYDAY', 'SAVINGS', 'LOAN_OFFSET');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "account_type" "account_type_enum" NOT NULL DEFAULT 'EVERYDAY';
