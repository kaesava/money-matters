import { z } from "zod";

export const CalculateEverydayBudgetCommand = z.object({
  annualEverydayTotal: z.number().positive(),
  daysToNextPaycheck: z.number().int().positive(),
});

export function calculateEverydayRequiredBudget(input: z.infer<typeof CalculateEverydayBudgetCommand>): number {
  const dailyBudget = input.annualEverydayTotal / 365.25;
  return dailyBudget * input.daysToNextPaycheck;
}

export const AllocationTier = z.enum(["TIER_1_EVERYDAY", "TIER_2_BILLS_MAJOR", "TIER_3_EVERYDAY", "TIER_4_BILLS_MAJOR", "TIER_5_EVERYDAY", "OVERFLOW"]);

export type CategoryRequirement = {
  categoryId: string;
  type: "major" | "bills" | "everyday";
  priority: number;
  targetAmount: number;
  currentBalance: number;
  paychecksRemaining: number;
};

export function calculateAllocationPlan(
  incomingAmount: number,
  everydayRequiredBudget: number,
  categories: CategoryRequirement[]
) {
  let remainingIncome = incomingAmount;
  const allocations = new Map<string, number>();

  // TIER 1: 50% of Everyday
  const tier1Everyday = everydayRequiredBudget * 0.50;
  const actualTier1 = Math.min(tier1Everyday, remainingIncome);
  allocations.set('EVERYDAY', actualTier1);
  remainingIncome -= actualTier1;

  // Implementation of other tiers would follow here...

  return { allocations, remainingIncome };
}
