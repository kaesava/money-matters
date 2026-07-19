-- Custom SQL migration file, put your code below! --

-- 1. Create transaction_source_enum and add source column to transaction_ledger
CREATE TYPE "public"."transaction_source_enum" AS ENUM('MANUAL', 'IMPORT');
ALTER TABLE "transaction_ledger" ADD COLUMN "source" "public"."transaction_source_enum" NOT NULL DEFAULT 'MANUAL';

-- 2. Add new columns to categories
ALTER TABLE "categories" ADD COLUMN "is_committed" boolean NOT NULL DEFAULT false;
ALTER TABLE "categories" ADD COLUMN "monthly_amount" numeric(12, 2);

-- 3. Add target_date to category_schedules
ALTER TABLE "category_schedules" ADD COLUMN "target_date" date;

-- 4. Update and transform categories types
-- Temp type conversion: first alter type table so that the old enum is renamed
-- In order to rename/change enum values cleanly, we create the new type, map rows, alter the table, and drop old type.
CREATE TYPE "public"."category_type_enum_new" AS ENUM('REGULAR', 'SAVINGS', 'EVERYDAY');

-- Migrate existing types: RECURRING -> REGULAR, MAJOR -> SAVINGS, EVERYDAY -> EVERYDAY
UPDATE "categories" SET "type" = 'EVERYDAY' WHERE "type"::text = 'EVERYDAY';
UPDATE "categories" SET "type" = 'EVERYDAY' WHERE "type"::text NOT IN ('MAJOR', 'RECURRING', 'EVERYDAY');

-- Set is_committed = true for MAJOR (now SAVINGS) and transfer target amount to monthly_amount for RECURRING (now REGULAR)
-- We will also migrate the values before changing the enum type:
ALTER TABLE "categories" ALTER COLUMN "type" TYPE text;
UPDATE "categories" SET "is_committed" = true WHERE "type" = 'MAJOR';
UPDATE "categories" SET "type" = 'REGULAR' WHERE "type" = 'RECURRING';
UPDATE "categories" SET "type" = 'SAVINGS' WHERE "type" = 'MAJOR';

-- Now alter the column back using the new enum type
ALTER TABLE "categories" ALTER COLUMN "type" TYPE "public"."category_type_enum_new" USING "type"::"public"."category_type_enum_new";

-- Rename new enum to the canonical name (need to drop/rename)
DROP TYPE "public"."category_type_enum";
ALTER TYPE "public"."category_type_enum_new" RENAME TO "category_type_enum";

-- 5. Migrate target amounts for REGULAR categories from schedules to the categories.monthly_amount column
UPDATE "categories" c
SET "monthly_amount" = s."target_amount"
FROM "category_schedules" s
WHERE s."category_id" = c."id" AND c."type" = 'REGULAR';

-- 6. Migrate target dates for SAVINGS categories
UPDATE "category_schedules" s
SET "target_date" = COALESCE(s."next_due_date", s."due_date")
FROM "categories" c
WHERE s."category_id" = c."id" AND c."type" = 'SAVINGS';

-- 7. Drop obsolete columns
ALTER TABLE "categories" DROP COLUMN IF EXISTS "priority_rank";
ALTER TABLE "category_schedules" DROP COLUMN IF EXISTS "rrule";
ALTER TABLE "category_schedules" DROP COLUMN IF EXISTS "next_due_date";
ALTER TABLE "allocation_plan_lines" DROP COLUMN IF EXISTS "is_shortfall_repayment";

-- 8. Alter allocation_plan_status_enum to PENDING, CONFIRMED
CREATE TYPE "public"."allocation_plan_status_enum_new" AS ENUM('PENDING', 'CONFIRMED');
ALTER TABLE "allocation_plans" ALTER COLUMN "status" TYPE text;
UPDATE "allocation_plans" SET "status" = 'PENDING' WHERE "status" IN ('DRAFT', 'REVIEWED');
ALTER TABLE "allocation_plans" ALTER COLUMN "status" TYPE "public"."allocation_plan_status_enum_new" USING "status"::"public"."allocation_plan_status_enum_new";
DROP TYPE "public"."allocation_plan_status_enum";
ALTER TYPE "public"."allocation_plan_status_enum_new" RENAME TO "allocation_plan_status_enum";

-- 9. Drop deprecated tables and enums
DROP TABLE IF EXISTS "shortfall_events" CASCADE;
DROP TABLE IF EXISTS "savings_reconciliations" CASCADE;
DROP TYPE IF EXISTS "shortfall_status_enum";