-- Migration 0038: create early_access_subscribers table
CREATE TABLE IF NOT EXISTS "early_access_subscribers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "app_id" uuid NOT NULL,
  "email" varchar(255) NOT NULL,
  "last_subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "early_access_app_id_email_idx" ON "early_access_subscribers" ("app_id", "email");
