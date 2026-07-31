-- Migration 0010: Create app_categories table for global template categories
CREATE TABLE IF NOT EXISTS "app_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "app_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "type" "category_type_enum" NOT NULL,
  "icon" varchar(50),
  "colour" varchar(7),
  "annualised_amount" numeric(12,2),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid NOT NULL
);
