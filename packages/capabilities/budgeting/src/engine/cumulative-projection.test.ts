import { describe, it, expect } from "vitest";
import { runCumulativeProjection, CumulativeProjectionIncomeEvent, CumulativeProjectionExpenseEvent } from "./cumulative-projection.js";
import { EngineBucket } from "./allocation-engine.js";

describe("cumulative-projection engine", () => {
  const mockCategories: EngineBucket[] = [
    {
      id: "pool-everyday",
      name: "Everyday Expenses",
      type: "EVERYDAY",
      everydayAllowanceAmount: 500,
      currentBalance: 200,
    },
    {
      id: "pool-bills",
      name: "Rent & Housing Bills",
      type: "REGULAR",
      isCommitted: true,
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

  it("should apply pro-rata burn to EVERYDAY pools and 1.5x cap to REGULAR pools", () => {
    const result = runCumulativeProjection({
      categories: [
        {
          id: "pool-everyday",
          name: "Everyday Expenses",
          type: "EVERYDAY",
          everydayAllowanceAmount: 600, // $600/mo = $20/day
          currentBalance: 500,
        },
        {
          id: "pool-bills",
          name: "Rent & Housing Bills",
          type: "REGULAR",
          monthlyAmount: 1000, // 1.5x cap = $1500
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

    // Bills: balance after alloc will exceed $1500, so it gets capped at $1500
    const billsAfterExp = step1.balancesAfterExpenses.get("pool-bills");
    expect(billsAfterExp).toBe(1500);
  });
});
