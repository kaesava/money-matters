-- Migration 0017: Consolidate tenant_user_preferences alert columns into app_preferences JSONB

-- 1. Migrate existing column values into app_preferences JSONB payload for existing rows
UPDATE public.tenant_user_preferences
SET app_preferences = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(app_preferences, '{}'::jsonb),
        ARRAY[app_id::text, 'payday_alerts_enabled'],
        to_jsonb(COALESCE(payday_alerts_enabled, true))
      ),
      ARRAY[app_id::text, 'shortfall_alerts_enabled'],
      to_jsonb(COALESCE(shortfall_alerts_enabled, true))
    ),
    ARRAY[app_id::text, 'bill_reminders_enabled'],
    to_jsonb(COALESCE(bill_reminders_enabled, true))
  ),
  ARRAY[app_id::text, 'weekly_digest_enabled'],
  to_jsonb(COALESCE(weekly_digest_enabled, false))
)
WHERE payday_alerts_enabled IS NOT NULL 
   OR shortfall_alerts_enabled IS NOT NULL 
   OR bill_reminders_enabled IS NOT NULL 
   OR weekly_digest_enabled IS NOT NULL;

-- 2. Drop the redundant top-level alert columns
ALTER TABLE public.tenant_user_preferences DROP COLUMN IF EXISTS payday_alerts_enabled;
ALTER TABLE public.tenant_user_preferences DROP COLUMN IF EXISTS shortfall_alerts_enabled;
ALTER TABLE public.tenant_user_preferences DROP COLUMN IF EXISTS bill_reminders_enabled;
ALTER TABLE public.tenant_user_preferences DROP COLUMN IF EXISTS weekly_digest_enabled;
