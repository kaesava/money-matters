-- Migration 0009: Migrate user_preferences to app_preferences JSONB
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "app_preferences" jsonb NOT NULL DEFAULT '{}';

-- Migrate existing quick_actions_collapsed if it existed as a column
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'quick_actions_collapsed'
  ) THEN
    UPDATE "user_preferences"
    SET "app_preferences" = jsonb_build_object(
      '01908bde-34bb-7b19-a178-574211bc93aa',
      jsonb_build_object('quick_actions_collapsed', quick_actions_collapsed)
    )
    WHERE quick_actions_collapsed = true;

    ALTER TABLE "user_preferences" DROP COLUMN "quick_actions_collapsed";
  END IF;
END $$;
