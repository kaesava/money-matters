-- Migration 0029: Add goal recurrence fields to pools
ALTER TABLE "pools" ADD COLUMN IF NOT EXISTS "entered_amount" numeric(12, 2);
ALTER TABLE "pools" ADD COLUMN IF NOT EXISTS "budget_frequency" varchar(50) DEFAULT 'MONTHLY';
ALTER TABLE "pools" ADD COLUMN IF NOT EXISTS "start_date" varchar(50);
ALTER TABLE "pools" ADD COLUMN IF NOT EXISTS "rrule" varchar(255);
