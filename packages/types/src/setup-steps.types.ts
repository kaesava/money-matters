import { z } from "zod";

export const SetupStepIdSchema = z.enum(["income", "accounts", "goals", "lifestyle", "review"]);
export type SetupStepId = z.infer<typeof SetupStepIdSchema>;

export interface SetupStepConfig {
  id: SetupStepId;
  stepNumber: number;
  titleKey: string;
}

export const FIRST_RUN_SETUP_STEPS: SetupStepConfig[] = [
  { id: "income", stepNumber: 1, titleKey: "setup.income.title" },
  { id: "accounts", stepNumber: 2, titleKey: "setup.bankAccountsStep.title" },
  { id: "goals", stepNumber: 3, titleKey: "setup.goals.title" },
  { id: "lifestyle", stepNumber: 4, titleKey: "setup.lifestyle.title" },
  { id: "review", stepNumber: 5, titleKey: "setup.review.title" },
];

export const RERUN_SETUP_STEPS: SetupStepConfig[] = [
  { id: "income", stepNumber: 1, titleKey: "setup.income.title" },
  { id: "goals", stepNumber: 2, titleKey: "setup.goals.title" },
  { id: "review", stepNumber: 3, titleKey: "setup.review.title" },
];

export function getSetupSteps(isRerun: boolean): SetupStepConfig[] {
  return isRerun ? RERUN_SETUP_STEPS : FIRST_RUN_SETUP_STEPS;
}

export function getTotalSetupSteps(isRerun: boolean): number {
  return isRerun ? 3 : 5;
}

export type SetupFrequency = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

/**
 * Converts a periodic amount in the given frequency to a rounded monthly equivalent.
 */
export function convertToMonthly(val: number, freq: SetupFrequency): number {
  if (freq === "WEEKLY") return Math.round((val * 52) / 12);
  if (freq === "FORTNIGHTLY") return Math.round((val * 26) / 12);
  if (freq === "QUARTERLY") return Math.round((val * 4) / 12);
  if (freq === "YEARLY") return Math.round(val / 12);
  return Math.round(val);
}

/**
 * Converts a monthly amount into the equivalent periodic amount for display/input.
 */
export function convertFromMonthly(monthlyVal: number, freq: SetupFrequency): number {
  if (freq === "WEEKLY") return Math.round((monthlyVal * 12) / 52);
  if (freq === "FORTNIGHTLY") return Math.round((monthlyVal * 12) / 26);
  if (freq === "QUARTERLY") return Math.round((monthlyVal * 12) / 4);
  if (freq === "YEARLY") return Math.round(monthlyVal * 12);
  return Math.round(monthlyVal);
}

/**
 * Returns the number of months remaining until a goal's target date (minimum 1, default 12).
 */
export function getGoalMonthsDiff(targetDateStr?: string | null): number {
  if (!targetDateStr) return 12;
  const now = new Date();
  const target = new Date(targetDateStr);
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(1, months);
}
