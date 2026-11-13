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
      { stepType: "EVERYDAY_ALLOWANCE" },
      { stepType: "PRIORITY_BILLS" },
      { stepType: "PRIORITY_GOALS" },
      { stepType: "STANDARD_BILLS" },
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
      { stepType: "PRIORITY_BILLS" },
      { stepType: "STANDARD_BILLS" },
      { stepType: "EVERYDAY_ALLOWANCE" },
      { stepType: "PRIORITY_GOALS" },
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
      { stepType: "PRIORITY_GOALS" },
      { stepType: "EVERYDAY_ALLOWANCE" },
      { stepType: "PRIORITY_BILLS" },
      { stepType: "STANDARD_GOALS" },
      { stepType: "STANDARD_BILLS" },
      { stepType: "SURPLUS_SWEEP" },
    ],
  },
} as const;
