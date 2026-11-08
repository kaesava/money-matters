-- Migration 0048: Add contribution_mode and contribution_value to income_events, add step types to allocation_step_type_enum

DO $$ 
BEGIN
  ALTER TYPE "allocation_step_type_enum" ADD VALUE IF NOT EXISTS 'ESSENTIAL_BILLS';
  ALTER TYPE "allocation_step_type_enum" ADD VALUE IF NOT EXISTS 'FLEXIBLE_BILLS';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "income_events" 
  ADD COLUMN IF NOT EXISTS "contribution_mode" "income_contribution_mode_enum" NOT NULL DEFAULT 'FULL',
  ADD COLUMN IF NOT EXISTS "contribution_value" numeric(12, 2);
