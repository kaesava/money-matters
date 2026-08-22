-- 0016_split_user_preferences.sql
-- Split user preferences into 2 tiers:
-- 1. user_preferences (Global, 1:1 per user_id)
-- 2. tenant_user_preferences (Scoped to user_id, tenant_id, app_id)

-- Create tenant_user_preferences table
CREATE TABLE IF NOT EXISTS public.tenant_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  payday_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  shortfall_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  bill_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  weekly_digest_enabled BOOLEAN NOT NULL DEFAULT false,
  app_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Unique index for tenant_user_preferences
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_user_prefs_unique 
  ON public.tenant_user_preferences(user_id, tenant_id, app_id);

-- Enable RLS on tenant_user_preferences
ALTER TABLE public.tenant_user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON public.tenant_user_preferences;
CREATE POLICY tenant_isolation_policy ON public.tenant_user_preferences
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- Refactor user_preferences table to be global user-level (1:1 with user_id)
-- Clean old columns from user_preferences
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS app_id;
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS payday_alerts_enabled;
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS shortfall_alerts_enabled;
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS bill_reminders_enabled;
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS weekly_digest_enabled;
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS app_preferences;
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS archived_at;
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS archived_by;

-- Add global columns if not exist
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS locale VARCHAR(20) NOT NULL DEFAULT 'en-AU';
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS theme VARCHAR(20) NOT NULL DEFAULT 'system';
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS show_icons BOOLEAN NOT NULL DEFAULT true;

-- Ensure user_id is unique on user_preferences
DROP INDEX IF EXISTS idx_user_prefs_user_id_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_prefs_user_id_unique ON public.user_preferences(user_id);
