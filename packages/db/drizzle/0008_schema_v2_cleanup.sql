ALTER TABLE "tenants" DROP COLUMN IF EXISTS "default_surplus_category_id";
ALTER TABLE "bank_accounts" DROP COLUMN IF EXISTS "purpose";
ALTER TABLE "bank_accounts" DROP COLUMN IF EXISTS "is_offset";
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "unbudgeted_buffer" numeric(12, 2) DEFAULT '0.00' NOT NULL;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "budget_frequency" varchar(20) DEFAULT 'MONTHLY';
ALTER TABLE "transaction_ledger" ADD COLUMN IF NOT EXISTS "transfer_group_id" uuid;
DROP TYPE IF EXISTS "account_purpose_enum";
