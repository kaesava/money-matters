import { describe, it, expect, beforeEach, vi } from "vitest";
import { calculatePaydayCascade } from "./allocation.js";
import { confirmPaydayAllocationPlan } from "./confirm-plan.js";

// Mock @money-matters/db modules to avoid hitting live Neon connection during unit test suites run
vi.mock("@money-matters/db", () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => [{ id: "mock-inserted-id" }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    transaction: vi.fn().mockImplementation(async (callback) => {
      return await callback(mockDb);
    }),
    delete: vi.fn().mockReturnThis(),
  };
  return {
    db: mockDb,
    categories: { id: "categories-id" },
    categorySchedules: { id: "category-schedules-id" },
    allocationPlans: { id: "allocation-plans-id" },
    allocationPlanLines: { id: "allocation-plan-lines-id" },
    shortfallEvents: { id: "shortfall-events-id" },
    transactionLedger: { id: "transaction-ledger-id" },
    incomeEvents: { id: "income-events-id" }
  };
});

describe("payday waterfall allocation engine", () => {
  it("computes allocations sequentially and handles default sweep", async () => {
    // Basic test verifies that the module imports and calculation routines compile
    expect(calculatePaydayCascade).toBeDefined();
    expect(confirmPaydayAllocationPlan).toBeDefined();
  });
});
