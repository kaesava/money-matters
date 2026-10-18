-- Migration 0026: Strip setup_completed and setup_completed_at from tenant_user_preferences app_preferences JSONB

UPDATE "tenant_user_preferences"
SET "app_preferences" = COALESCE(
  (
    SELECT jsonb_object_agg(
      key,
      value - 'setup_completed' - 'setup_completed_at'
    )
    FROM jsonb_each("app_preferences")
  ),
  '{}'::jsonb
)
WHERE "app_preferences" IS NOT NULL AND "app_preferences" != '{}'::jsonb;
