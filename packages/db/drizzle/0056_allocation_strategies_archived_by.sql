-- Migration 0056: Add missing archived_by audit column to allocation_strategies and allocation_strategy_steps
ALTER TABLE "allocation_strategies"
  ADD COLUMN IF NOT EXISTS "archived_by" uuid;

ALTER TABLE "allocation_strategy_steps"
  ADD COLUMN IF NOT EXISTS "archived_by" uuid;
