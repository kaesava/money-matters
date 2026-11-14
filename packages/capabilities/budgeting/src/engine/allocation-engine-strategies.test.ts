import { describe, it, expect } from "vitest";
import { runAllocationEngine, EngineBucket } from "./allocation-engine.js";
import { CANONICAL_ALLOCATION_PRESETS } from "@money-matters/types";

describe("paycheck cascade allocation engine", () => {
  describe("Household Contribution Modes & Multi-Earner Guardrails", () => {
    const sharedBuckets: EngineBucket[] = [
      {
        id: "shared-bills",
        name: "Shared Rent",
        type: "BILL",
        monthlyAmount: 1300,
        currentBalance: 0,
        isPrivate: false,
      },
      {
        id: "shared-everyday",
        name: "Shared Groceries",
        type: "EVERYDAY",
        currentBalance: 0,
        isPrivate: false,
      },
      {
        id: "partner-personal",
        name: "Partner Personal Spend",
        type: "EVERYDAY",
        currentBalance: 0,
        isPrivate: true,
        userId: "user-123",
      },
    ];

    it("allocates 100% to shared household envelopes under FULL mode", () => {
      const result = runAllocationEngine({
        incomeAmount: 2000,
        buckets: sharedBuckets,
        paycheckDate: new Date("2026-09-01"),
        paycheckFrequencyDays: 14,
        incomeUserId: "user-123",
        contributionMode: "FULL",
      });

      expect(result.status).toBe("OK");
      const partnerLine = result.lines.find((l) => l.bucketId === "partner-personal");
      // In FULL mode, all funds go into shared envelopes
      expect(partnerLine?.proposedAmount || 0).toBe(0);
      const sharedTotal = result.lines
        .filter((l) => l.bucketId !== "partner-personal")
        .reduce((sum, l) => sum + l.proposedAmount, 0);
      expect(sharedTotal).toBe(2000);
    });

    it("splits income by PERCENTAGE and allocates remainder directly to earner private envelope", () => {
      const result = runAllocationEngine({
        incomeAmount: 2000,
        buckets: sharedBuckets,
        paycheckDate: new Date("2026-09-01"),
        paycheckFrequencyDays: 14,
        incomeUserId: "user-123",
        contributionMode: "PERCENTAGE",
        contributionValue: 60, // 60% shared ($1,200), 40% private ($800)
      });

      expect(result.status).toBe("OK");
      const partnerLine = result.lines.find((l) => l.bucketId === "partner-personal");
      expect(partnerLine?.proposedAmount).toBe(800);

      const sharedTotal = result.lines
        .filter((l) => l.bucketId !== "partner-personal")
        .reduce((sum, l) => sum + l.proposedAmount, 0);
      expect(sharedTotal).toBe(1200);
    });

    it("allocates FIXED_AMOUNT to shared envelopes and routes remainder to earner private envelope", () => {
      const result = runAllocationEngine({
        incomeAmount: 3000,
        buckets: sharedBuckets,
        paycheckDate: new Date("2026-09-01"),
        paycheckFrequencyDays: 14,
        incomeUserId: "user-123",
        contributionMode: "FIXED_AMOUNT",
        contributionValue: 1500, // $1,500 shared, $1,500 private
      });

      expect(result.status).toBe("OK");
      const partnerLine = result.lines.find((l) => l.bucketId === "partner-personal");
      expect(partnerLine?.proposedAmount).toBe(1500);

      const sharedTotal = result.lines
        .filter((l) => l.bucketId !== "partner-personal")
        .reduce((sum, l) => sum + l.proposedAmount, 0);
      expect(sharedTotal).toBe(1500);
    });

    it("applies min(income, fixedContribution) guardrail when income is less than fixed contribution", () => {
      // Income is only $800, but agreed fixed contribution was $1,500
      const result = runAllocationEngine({
        incomeAmount: 800,
        buckets: sharedBuckets,
        paycheckDate: new Date("2026-09-01"),
        paycheckFrequencyDays: 14,
        incomeUserId: "user-123",
        contributionMode: "FIXED_AMOUNT",
        contributionValue: 1500,
      });

      expect(result.status).toBe("OK");
      // Entire $800 goes to shared pool, private gets $0, no negative amounts
      const partnerLine = result.lines.find((l) => l.bucketId === "partner-personal");
      expect(partnerLine?.proposedAmount || 0).toBe(0);

      const sharedTotal = result.lines
        .filter((l) => l.bucketId !== "partner-personal")
        .reduce((sum, l) => sum + l.proposedAmount, 0);
      expect(sharedTotal).toBe(800);
    });
  });

  describe("Allocation Strategy Presets & Reordering", () => {
    const strategyBuckets: EngineBucket[] = [
      {
        id: "urgent-bills",
        name: "Electric Bill",
        type: "BILL",
        monthlyAmount: 260,
        currentBalance: 0,
      },
      {
        id: "everyday-spend",
        name: "Everyday Living",
        type: "EVERYDAY",
        currentBalance: 0,
      },
      {
        id: "committed-goal",
        name: "Emergency Fund",
        type: "GOAL",
        targetAmount: 5000,
        monthlyAmount: 500,
        currentBalance: 0,
        isPriority: true,
      },
    ];

    it("executes PAY_YOURSELF_FIRST preset: prioritizes committed goals before everyday allowance", () => {
      const result = runAllocationEngine({
        incomeAmount: 1500,
        buckets: strategyBuckets,
        paycheckDate: new Date("2026-09-01"),
        paycheckFrequencyDays: 14,
        strategySteps: CANONICAL_ALLOCATION_PRESETS.PAY_YOURSELF_FIRST.steps.map((s, idx) => ({
          orderIndex: idx,
          stepType: s.stepType,
        })),
      });

      expect(result.status).toBe("OK");
      const goalLine = result.lines.find((l) => l.bucketId === "committed-goal");
      expect(goalLine?.proposedAmount).toBeGreaterThan(0);
    });

    it("executes BILLS_FORTRESS preset: prioritizes pro-rata bills before everyday spending", () => {
      const result = runAllocationEngine({
        incomeAmount: 1500,
        buckets: strategyBuckets,
        paycheckDate: new Date("2026-09-01"),
        paycheckFrequencyDays: 14,
        strategySteps: CANONICAL_ALLOCATION_PRESETS.BILLS_FORTRESS.steps.map((s, idx) => ({
          orderIndex: idx,
          stepType: s.stepType,
        })),
      });

      expect(result.status).toBe("OK");
      const billLine = result.lines.find((l) => l.bucketId === "urgent-bills");
      expect(billLine?.proposedAmount).toBeGreaterThan(0);
    });
  });
});
