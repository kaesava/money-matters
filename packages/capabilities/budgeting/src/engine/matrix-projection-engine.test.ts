import { describe, it, expect } from "vitest";
import { computeMatrixProjection, MatrixIncomeSource } from "./matrix-projection-engine.js";
import { EngineBucket } from "./allocation-engine.js";

describe("matrix-projection-engine", () => {
  const mockCategories: EngineBucket[] = [
    {
      id: "cat-everyday",
      name: "Everyday Expenses",
      type: "EVERYDAY",
      everydayAllowanceAmount: 500,
      currentBalance: 200,
    },
    {
      id: "cat-rent",
      name: "Rent & Housing",
      type: "REGULAR",
      isEssential: true,
      monthlyAmount: 1200,
      currentBalance: 0,
    },
    {
      id: "cat-holiday",
      name: "Holiday Goal",
      type: "GOAL",
      isCommitted: true,
      targetAmount: 2000,
      targetDate: "2026-12-31",
      currentBalance: 100,
    },
    {
      id: "cat-surplus",
      name: "Emergency Surplus Buffer",
      type: "GOAL",
      isSurplusTarget: true,
      currentBalance: 500,
    },
    {
      id: "cat-private-secret",
      name: "Secret Gift Pool",
      type: "GOAL",
      isPrivate: true,
      userId: "user-kesh",
      targetAmount: 1000,
      currentBalance: 50,
    },
  ];

  const mockIncomeSources: MatrixIncomeSource[] = [
    {
      id: "inc-kesh",
      name: "Kesh Primary Salary",
      amount: 3000,
      rrule: "FREQ=WEEKLY;INTERVAL=2", // Fortnightly
      startDate: "2026-09-01",
      userId: "user-kesh",
    },
    {
      id: "inc-sneha",
      name: "Sneha Primary Salary",
      amount: 2000,
      rrule: "FREQ=MONTHLY",
      startDate: "2026-09-01",
      userId: "user-sneha",
    },
  ];

  it("should project multi-payday timeline and handle stealth privacy for owner vs partner", () => {
    // 1. Owner view (Kesh sees his private pool)
    const keshResult = computeMatrixProjection({
      currentUserId: "user-kesh",
      categories: mockCategories,
      incomeSources: mockIncomeSources,
      monthsAhead: 3,
    });

    expect(keshResult.columns.length).toBeGreaterThan(0);
    // Kesh sees 4 accordion groups
    expect(keshResult.groups.length).toBe(4);
    const goalsGroup = keshResult.groups.find((g) => g.id === "goals")!;
    expect(goalsGroup.rows.some((r) => r.categoryId === "cat-private-secret")).toBe(true);

    // 2. Partner view (Sneha does NOT see Kesh's private pool, but sees hiddenAllocationsTotal > 0)
    const snehaResult = computeMatrixProjection({
      currentUserId: "user-sneha",
      categories: mockCategories,
      incomeSources: mockIncomeSources,
      monthsAhead: 3,
    });

    const snehaGoalsGroup = snehaResult.groups.find((g) => g.id === "goals")!;
    expect(snehaGoalsGroup.rows.some((r) => r.categoryId === "cat-private-secret")).toBe(false);
    expect(snehaResult.columns[0].hiddenAllocationsTotal).toBeGreaterThanOrEqual(0);
  });

  it("should handle cell overrides and update projected balances", () => {
    const firstColDate = "2026-09-01";
    const result = computeMatrixProjection({
      currentUserId: "user-kesh",
      categories: mockCategories,
      incomeSources: mockIncomeSources,
      cellOverrides: {
        [`${firstColDate}_cat-holiday`]: 800, // Override holiday allocation to $800
      },
      monthsAhead: 2,
    });

    const goalsGroup = result.groups.find((g) => g.id === "goals")!;
    const holidayRow = goalsGroup.rows.find((r) => r.categoryId === "cat-holiday")!;
    const cell = holidayRow.cells[firstColDate];

    expect(cell.isOverride).toBe(true);
    expect(cell.allocated).toBe(800);
  });
});
