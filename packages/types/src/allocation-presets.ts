import { AllocationStepType } from "./allocation-strategy.types.js";

export interface CanonicalStepConfig {
  stepType: AllocationStepType;
  config?: Record<string, unknown>;
}

export interface CanonicalPreset {
  presetKey: "BALANCED" | "BILLS_FORTRESS" | "PAY_YOURSELF_FIRST";
  nameKey: string;
  descriptionKey: string;
  steps: readonly CanonicalStepConfig[];
}

export const CANONICAL_ALLOCATION_PRESETS: Record<
  "BALANCED" | "BILLS_FORTRESS" | "PAY_YOURSELF_FIRST",
  CanonicalPreset
> = {
  BALANCED: {
    presetKey: "BALANCED",
    nameKey: "settings.paydayRules.presets.balanced.name",
    descriptionKey: "settings.paydayRules.presets.balanced.description",
    steps: [
      { stepType: "IMMEDIATE_BILLS" },
      { stepType: "DEFICIT_REPAIR" },
      { stepType: "BILLS_SAFETY_FLOOR" },
      { stepType: "EVERYDAY_ALLOWANCE" },
      { stepType: "ESSENTIAL_BILLS" },
      { stepType: "COMMITTED_GOALS" },
      { stepType: "FLEXIBLE_BILLS" },
      { stepType: "STANDARD_GOALS" },
      { stepType: "SURPLUS_SWEEP" },
    ],
  },
  BILLS_FORTRESS: {
    presetKey: "BILLS_FORTRESS",
    nameKey: "settings.paydayRules.presets.billsFortress.name",
    descriptionKey: "settings.paydayRules.presets.billsFortress.description",
    steps: [
      { stepType: "IMMEDIATE_BILLS" },
      { stepType: "DEFICIT_REPAIR" },
      { stepType: "BILLS_SAFETY_FLOOR" },
      { stepType: "ESSENTIAL_BILLS" },
      { stepType: "FLEXIBLE_BILLS" },
      { stepType: "EVERYDAY_ALLOWANCE" },
      { stepType: "COMMITTED_GOALS" },
      { stepType: "STANDARD_GOALS" },
      { stepType: "SURPLUS_SWEEP" },
    ],
  },
  PAY_YOURSELF_FIRST: {
    presetKey: "PAY_YOURSELF_FIRST",
    nameKey: "settings.paydayRules.presets.payYourselfFirst.name",
    descriptionKey: "settings.paydayRules.presets.payYourselfFirst.description",
    steps: [
      { stepType: "IMMEDIATE_BILLS" },
      { stepType: "DEFICIT_REPAIR" },
      { stepType: "COMMITTED_GOALS" },
      { stepType: "BILLS_SAFETY_FLOOR" },
      { stepType: "EVERYDAY_ALLOWANCE" },
      { stepType: "ESSENTIAL_BILLS" },
      { stepType: "STANDARD_GOALS" },
      { stepType: "FLEXIBLE_BILLS" },
      { stepType: "SURPLUS_SWEEP" },
    ],
  },
} as const;
