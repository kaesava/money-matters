-- 0052: Add simulation and customAllocationRules feature flags
ALTER TABLE "apps" ALTER COLUMN "feature_flags" SET DEFAULT '{"aiAssistant":true,"privateMode":true,"fileNotes":true,"fileNotesMaxStorageMb":100,"fileNotesMaxFileMb":10,"simulation":true,"customAllocationRules":true}'::jsonb;

-- Backfill existing apps to include new flags if absent
UPDATE "apps"
SET "feature_flags" = "feature_flags" || '{"simulation":true,"customAllocationRules":true}'::jsonb
WHERE NOT ("feature_flags" ? 'simulation') OR NOT ("feature_flags" ? 'customAllocationRules');
