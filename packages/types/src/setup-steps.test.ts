import { describe, it, expect } from "vitest";
import { FIRST_RUN_SETUP_STEPS, RERUN_SETUP_STEPS, getSetupSteps, getTotalSetupSteps } from "./setup-steps.types.js";
import { simulateSetupPaydaySandbox } from "./setup-sandbox-simulation.js";

describe("Setup Steps Parity", () => {
  it("defines ordered steps for first-run setup matching exactly 5 steps ending with review", () => {
    expect(FIRST_RUN_SETUP_STEPS.map((s) => s.id)).toEqual([
      "income",
      "accounts",
      "goals",
      "lifestyle",
      "review",
    ]);
    expect(getTotalSetupSteps(false)).toBe(5);
  });

  it("defines ordered steps for rerun setup matching exactly 3 steps ending with review", () => {
    expect(RERUN_SETUP_STEPS.map((s) => s.id)).toEqual([
      "income",
      "goals",
      "review",
    ]);
    expect(getTotalSetupSteps(true)).toBe(3);
  });

  it("getSetupSteps returns corresponding array according to isRerun flag", () => {
    expect(getSetupSteps(false)).toEqual(FIRST_RUN_SETUP_STEPS);
    expect(getSetupSteps(true)).toEqual(RERUN_SETUP_STEPS);
  });

  it("simulateSetupPaydaySandbox prorates waterfall allocations across regular bills, everyday, and goals", () => {
    const res = simulateSetupPaydaySandbox({
      paycheckAmount: 3000,
      incomes: [{ id: "1", name: "Salary", amount: 3000, frequency: "FORTNIGHTLY", type: "SALARY" }],
      activeEveryday: [{ name: "Everyday", type: "EVERYDAY", monthlyAud: 1300, icon: "🛒" }],
      activeRegular: [{ name: "Rent", type: "BILL", monthlyAud: 2600, icon: "📌", isPriority: true }],
      activeGoals: [{ name: "Emergency Reserve", type: "GOAL", monthlyAud: 650, icon: "🎯", isSurplusTarget: true }],
      goals: [{ id: "g1", name: "Emergency Reserve", monthlyAmount: 650, fundingMode: "RECURRING", isPriority: true, isSurplusTarget: true, icon: "🎯" }],
    });
    expect(res.billsAllocated + res.goalsAllocated + res.safeToSpend).toBeCloseTo(3000, 2);
    expect(res.billsAllocated).toBeGreaterThan(0);
    expect(res.safeToSpend).toBeGreaterThan(0);
    expect(res.goalsAllocated).toBeGreaterThan(0);
    expect(res.surplusTargetName).toBe("Emergency Reserve");
  });
});
