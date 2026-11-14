import { describe, it, expect } from "vitest";
import { runCumulativeProjection, CumulativeProjectionIncomeEvent, CumulativeProjectionExpenseEvent } from "./cumulative-projection.js";
import { EngineBucket } from "./allocation-engine.js";

describe("cumulative-projection engine", () => {
  const mockCategories: EngineBucket[] = [
    {
      id: "pool-everyday",
      name: "Everyday Expenses",
      type: "EVERYDAY",
      monthlyAmount: 500,
      currentBalance: 200,
    },
    {
      id: "pool-bills",
      name: "Rent & Housing Bills",
      type: "BILL",
      isPriority: true,
      monthlyAmount: 1000,
      currentBalance: 100,
    },
    {
      id: "pool-surplus",
      name: "Offset Surplus Sweep",
      type: "GOAL",
      isSurplusTarget: true,
      currentBalance: 0,
    },
  ];

  const mockIncomeEvents: CumulativeProjectionIncomeEvent[] = [
    {
      id: "evt-1",
      sourceName: "Salary 1",
      expectedDate: "2026-09-01",
      expectedAmount: 2000,
      status: "PENDING",
    },
    {
      id: "evt-2",
      sourceName: "Salary 2",
      expectedDate: "2026-09-15",
      expectedAmount: 2000,
      status: "PENDING",
    },
  ];

  const mockExpenseEvents: CumulativeProjectionExpenseEvent[] = [
    {
      poolId: "pool-bills",
      amount: 800,
      dueDate: "2026-09-10",
      status: "PENDING",
    },
  ];

  it("should project cumulative timeline and deduct intermediate expenses between income events", () => {
    const result = runCumulativeProjection({
      categories: mockCategories,
      incomeEvents: mockIncomeEvents,
      expenseEvents: mockExpenseEvents,
    });

    expect(result.steps.length).toBe(2);

    // Step 1: Event 1 on 2026-09-01
    const step1 = result.steps[0];
    expect(step1.incomeEvent.id).toBe("evt-1");
    // Expense on 2026-09-10 is due before Event 2 (2026-09-15), so it gets deducted after Event 1 allocation
    expect(step1.deductedExpenses.length).toBe(1);
    expect(step1.deductedExpenses[0].amount).toBe(800);

    // Step 2: Event 2 on 2026-09-15
    const step2 = result.steps[1];
    expect(step2.incomeEvent.id).toBe("evt-2");
    // Starting balance for Event 2 reflects the deduction of the $800 bill
    const billsBalBeforeEvent2 = step2.balancesBeforeAlloc.get("pool-bills");
    expect(billsBalBeforeEvent2).toBeCloseTo(step1.balancesAfterExpenses.get("pool-bills")!, 2);
  });

  it("should sort same-day income events deterministically by id", () => {
    const sameDayIncomes: CumulativeProjectionIncomeEvent[] = [
      { id: "evt-b", expectedDate: "2026-09-01", expectedAmount: 1000, status: "PENDING" },
      { id: "evt-a", expectedDate: "2026-09-01", expectedAmount: 1500, status: "PENDING" },
    ];

    const result = runCumulativeProjection({
      categories: mockCategories,
      incomeEvents: sameDayIncomes,
    });

    expect(result.steps[0].incomeEvent.id).toBe("evt-a");
    expect(result.steps[1].incomeEvent.id).toBe("evt-b");
  });

  it("should apply saved draft plans when present", () => {
    const result = runCumulativeProjection({
      categories: mockCategories,
      incomeEvents: mockIncomeEvents,
      savedPlans: {
        "evt-1": [
          { poolId: "pool-bills", proposedAmount: 1200, reasoning: "User custom draft" },
          { poolId: "pool-everyday", proposedAmount: 800 },
        ],
      },
    });

    const step1 = result.steps[0];
    expect(step1.allocations.get("pool-bills")?.proposedAmount).toBe(1200);
    expect(step1.allocations.get("pool-bills")?.isOverride).toBe(true);
  });

  it("should apply pro-rata burn to EVERYDAY pools without artificially capping sinking bills pools", () => {
    const result = runCumulativeProjection({
      categories: [
        {
          id: "pool-everyday",
          name: "Everyday Expenses",
          type: "EVERYDAY",
          monthlyAmount: 600, // $600/mo = $20/day
          currentBalance: 500,
        },
        {
          id: "pool-bills",
          name: "Rent & Housing Bills",
          type: "BILL",
          monthlyAmount: 1000,
          currentBalance: 1400,
        },
        {
          id: "pool-surplus",
          name: "Surplus Target",
          type: "GOAL",
          isSurplusTarget: true,
          currentBalance: 0,
        },
      ],
      incomeEvents: [
        { id: "evt-1", expectedDate: "2026-09-01", expectedAmount: 2000, status: "PENDING" },
        { id: "evt-2", expectedDate: "2026-09-15", expectedAmount: 2000, status: "PENDING" }, // 14-day gap ($280 burn)
      ],
    });

    const step1 = result.steps[0];
    // Everyday: $500 balance + $280 alloc (14 days gap) - $280 burn (14 days @ $20/day) = $500
    const everydayAfterExp = step1.balancesAfterExpenses.get("pool-everyday");
    expect(everydayAfterExp).toBeLessThan(500 + 280);

    // Bills: balance after alloc accumulates naturally without being artificially trimmed to 1.5x
    const billsAfterExp = step1.balancesAfterExpenses.get("pool-bills");
    expect(billsAfterExp).toBeGreaterThan(1500);
  });

  it("should preserve and accurately project confirmed income events with their cellOverrides", () => {
    const result = runCumulativeProjection({
      categories: mockCategories,
      incomeEvents: [
        { id: "evt-confirmed-1", expectedDate: "2026-08-15", expectedAmount: 2500, status: "CONFIRMED" },
        { id: "evt-pending-2", expectedDate: "2026-09-01", expectedAmount: 2500, status: "PENDING" },
      ],
      cellOverrides: {
        "evt-confirmed-1_pool-bills": 1500,
        "evt-confirmed-1_pool-everyday": 1000,
      },
    });

    expect(result.steps.length).toBe(2);
    const confirmedStep = result.steps[0];
    expect(confirmedStep.incomeEvent.id).toBe("evt-confirmed-1");
    expect(confirmedStep.allocations.get("pool-bills")?.proposedAmount).toBe(1500);
    expect(confirmedStep.allocations.get("pool-bills")?.reasoning).toBe("Confirmed allocation plan");
    expect(confirmedStep.allocations.get("pool-everyday")?.proposedAmount).toBe(1000);
  });

  it("should preserve and accurately project pending income events with custom saved cellOverrides", () => {
    const result = runCumulativeProjection({
      categories: mockCategories,
      incomeEvents: [
        { id: "evt-pending-1", expectedDate: "2026-09-01", expectedAmount: 2500, status: "PENDING" },
      ],
      cellOverrides: {
        "evt-pending-1_pool-bills": 1400,
        "evt-pending-1_pool-everyday": 1100,
      },
    });

    expect(result.steps.length).toBe(1);
    const draftStep = result.steps[0];
    expect(draftStep.incomeEvent.id).toBe("evt-pending-1");
    expect(draftStep.allocations.get("pool-bills")?.proposedAmount).toBe(1400);
    expect(draftStep.allocations.get("pool-bills")?.reasoning).toBe("Custom saved allocation plan");
    expect(draftStep.allocations.get("pool-bills")?.isOverride).toBe(true);
    expect(draftStep.allocations.get("pool-everyday")?.proposedAmount).toBe(1100);
  });

  it("should respect custom strategySteps and personalStrategySteps independently", () => {
    const result = runCumulativeProjection({
      currentUserId: "user-1",
      categories: [
        ...mockCategories,
        { id: "priv-goal", name: "Private Goal", type: "GOAL", targetAmount: 2000, monthlyAmount: 500, currentBalance: 0, isPrivate: true, userId: "user-1", isPriority: true },
        { id: "priv-everyday", name: "Private Spend", type: "EVERYDAY", monthlyAmount: 500, currentBalance: 0, isPrivate: true, userId: "user-1" },
      ],
      incomeEvents: [
        {
          id: "evt-split-1",
          expectedDate: "2026-09-01",
          expectedAmount: 1000,
          status: "PENDING",
          contributionMode: "PERCENTAGE",
          contributionValue: 50,
        },
      ],
      strategySteps: [
        { stepType: "EVERYDAY_ALLOWANCE" },
        { stepType: "STANDARD_BILLS" },
        { stepType: "SURPLUS_SWEEP" },
      ],
      personalStrategySteps: [
        { stepType: "PRIORITY_GOALS" },
        { stepType: "EVERYDAY_ALLOWANCE" },
        { stepType: "SURPLUS_SWEEP" },
      ],
    });

    const step = result.steps[0];
    expect(step.allocations.get("priv-goal")?.proposedAmount).toBeGreaterThan(0);
    expect(step.allocations.get("pool-everyday")?.proposedAmount).toBeGreaterThan(0);
  });
});
