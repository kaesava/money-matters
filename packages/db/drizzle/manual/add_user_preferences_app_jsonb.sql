-- Adds app_preferences JSONB column to user_preferences.
-- Migrates existing quick_actions_collapsed data into the JSONB blob.
-- Drops the old boolean column.

-- Step 1: Add the new JSONB column
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "app_preferences" jsonb NOT NULL DEFAULT '{}';

-- Step 2: Migrate existing data — move quick_actions_collapsed=true into the JSONB blob
-- Uses the hardcoded Money Matters app_id
UPDATE "user_preferences"
SET "app_preferences" = jsonb_build_object(
  '01908bde-34bb-7b19-a178-574211bc93aa',
  jsonb_build_object('quick_actions_collapsed', quick_actions_collapsed)
)
WHERE "quick_actions_collapsed" = true;

-- Step 3: Drop the old typed column
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "quick_actions_collapsed";
