import { z } from "zod";
export declare const CalculateEverydayBudgetCommand: z.ZodObject<{
    annualEverydayTotal: z.ZodNumber;
    daysToNextPaycheck: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    annualEverydayTotal: number;
    daysToNextPaycheck: number;
}, {
    annualEverydayTotal: number;
    daysToNextPaycheck: number;
}>;
export declare function calculateEverydayRequiredBudget(input: z.infer<typeof CalculateEverydayBudgetCommand>): number;
export declare const AllocationTier: z.ZodEnum<["TIER_1_EVERYDAY", "TIER_2_BILLS_MAJOR", "TIER_3_EVERYDAY", "TIER_4_BILLS_MAJOR", "TIER_5_EVERYDAY", "OVERFLOW"]>;
export type CategoryRequirement = {
    categoryId: string;
    type: "major" | "bills" | "everyday";
    priority: number;
    targetAmount: number;
    currentBalance: number;
    paychecksRemaining: number;
};
export declare function calculateAllocationPlan(incomingAmount: number, everydayRequiredBudget: number, categories: CategoryRequirement[]): {
    allocations: Map<string, number>;
    remainingIncome: number;
};
//# sourceMappingURL=index.d.ts.map