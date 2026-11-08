-- 0051: Add app feature flags JSONB column and restore file_notes with stealth RLS

-- 1. Add feature_flags to apps table
ALTER TABLE "apps" ADD COLUMN IF NOT EXISTS "feature_flags" jsonb DEFAULT '{"aiAssistant":true,"privateMode":true,"fileNotes":true,"fileNotesMaxStorageMb":100,"fileNotesMaxFileMb":10}'::jsonb NOT NULL;

-- 2. Create file_notes table
CREATE TABLE IF NOT EXISTS "file_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" varchar(50) NOT NULL,
  "entity_id" uuid NOT NULL,
  "comment" text,
  "file_key" varchar(512),
  "file_name" varchar(255),
  "file_mime_type" varchar(100),
  "file_size" varchar(50),
  "is_private" boolean DEFAULT false NOT NULL,
  "user_id" uuid REFERENCES "users"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" uuid NOT NULL REFERENCES "apps"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL REFERENCES "users"("id"),
  "archived_at" timestamp with time zone,
  "archived_by" uuid REFERENCES "users"("id")
);

-- 3. Create high-performance indexes
CREATE INDEX IF NOT EXISTS file_notes_tenant_entity_idx ON file_notes (tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS file_notes_tenant_storage_idx ON file_notes (tenant_id, archived_at) WHERE file_key IS NOT NULL;

-- 4. Enable PostgreSQL Row Level Security (RLS)
ALTER TABLE file_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_and_stealth_isolation ON file_notes;
CREATE POLICY tenant_and_stealth_isolation ON file_notes
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    AND (
      is_private = false
      OR user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
  );
