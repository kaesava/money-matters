-- Migration 0021: Add transfer_sources and transfer_events tables with tenant isolation RLS
DO $$ BEGIN
  CREATE TYPE "transfer_event_status_enum" AS ENUM('UPCOMING', 'SKIPPED', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "transfer_sources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "source_pool_id" uuid NOT NULL REFERENCES "pools"("id"),
  "destination_pool_id" uuid NOT NULL REFERENCES "pools"("id"),
  "rrule" varchar(255),
  "start_date" date,
  "end_date" date,
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE TABLE IF NOT EXISTS "transfer_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "transfer_source_id" uuid REFERENCES "transfer_sources"("id"),
  "source_pool_id" uuid NOT NULL REFERENCES "pools"("id"),
  "destination_pool_id" uuid NOT NULL REFERENCES "pools"("id"),
  "name" varchar(255) NOT NULL,
  "expected_date" date NOT NULL,
  "expected_amount" numeric(12, 2) NOT NULL,
  "actual_amount" numeric(12, 2),
  "note" varchar(500),
  "is_overridden" boolean DEFAULT false NOT NULL,
  "status" "transfer_event_status_enum" DEFAULT 'UPCOMING' NOT NULL,
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

ALTER TABLE "transfer_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transfer_events" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'transfer_sources' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY tenant_isolation ON "transfer_sources"
      FOR ALL
      USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'transfer_events' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY tenant_isolation ON "transfer_events"
      FOR ALL
      USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
  END IF;
END $$;
