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
  return isRerun ? 2 : 4;
}
