"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllocationTier = exports.CalculateEverydayBudgetCommand = void 0;
exports.calculateEverydayRequiredBudget = calculateEverydayRequiredBudget;
exports.calculateAllocationPlan = calculateAllocationPlan;
const zod_1 = require("zod");
exports.CalculateEverydayBudgetCommand = zod_1.z.object({
    annualEverydayTotal: zod_1.z.number().positive(),
    daysToNextPaycheck: zod_1.z.number().int().positive(),
});
function calculateEverydayRequiredBudget(input) {
    const dailyBudget = input.annualEverydayTotal / 365.25;
    return dailyBudget * input.daysToNextPaycheck;
}
exports.AllocationTier = zod_1.z.enum(["TIER_1_EVERYDAY", "TIER_2_BILLS_MAJOR", "TIER_3_EVERYDAY", "TIER_4_BILLS_MAJOR", "TIER_5_EVERYDAY", "OVERFLOW"]);
function calculateAllocationPlan(incomingAmount, everydayRequiredBudget, categories) {
    let remainingIncome = incomingAmount;
    const allocations = new Map();
    // TIER 1: 50% of Everyday
    const tier1Everyday = everydayRequiredBudget * 0.50;
    const actualTier1 = Math.min(tier1Everyday, remainingIncome);
    allocations.set('EVERYDAY', actualTier1);
    remainingIncome -= actualTier1;
    // Implementation of other tiers would follow here...
    return { allocations, remainingIncome };
}
//# sourceMappingURL=index.js.map