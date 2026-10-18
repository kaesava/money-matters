-- Migration 0023: Clean event status enums (PENDING, CONFIRMED) and delete skipped event rows

-- 1. Delete any legacy SKIPPED rows from income_events and expense_events
DELETE FROM "income_events" WHERE "status"::text IN ('SKIPPED', 'UPCOMING', 'PAID', 'DRAFT', 'REVIEWED') OR "status" IS NULL;
DELETE FROM "expense_events" WHERE "status"::text IN ('SKIPPED', 'UPCOMING', 'PAID', 'DRAFT', 'REVIEWED') OR "status" IS NULL;

-- 2. Alter income_event_status_enum
CREATE TYPE "public"."income_event_status_enum_new" AS ENUM('PENDING', 'CONFIRMED');
ALTER TABLE "income_events" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "income_events" ALTER COLUMN "status" TYPE "public"."income_event_status_enum_new" USING (
  CASE 
    WHEN "status"::text = 'CONFIRMED' THEN 'CONFIRMED'::"public"."income_event_status_enum_new"
    ELSE 'PENDING'::"public"."income_event_status_enum_new"
  END
);
DROP TYPE IF EXISTS "public"."income_event_status_enum";
ALTER TYPE "public"."income_event_status_enum_new" RENAME TO "income_event_status_enum";
ALTER TABLE "income_events" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "income_events" ALTER COLUMN "status" SET NOT NULL;

-- 3. Alter expense_event_status_enum
CREATE TYPE "public"."expense_event_status_enum_new" AS ENUM('PENDING', 'CONFIRMED');
ALTER TABLE "expense_events" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "expense_events" ALTER COLUMN "status" TYPE "public"."expense_event_status_enum_new" USING (
  CASE 
    WHEN "status"::text = 'CONFIRMED' THEN 'CONFIRMED'::"public"."expense_event_status_enum_new"
    ELSE 'PENDING'::"public"."expense_event_status_enum_new"
  END
);
DROP TYPE IF EXISTS "public"."expense_event_status_enum";
ALTER TYPE "public"."expense_event_status_enum_new" RENAME TO "expense_event_status_enum";
ALTER TABLE "expense_events" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "expense_events" ALTER COLUMN "status" SET NOT NULL;
