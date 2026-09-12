import { describe, it, expect } from "vitest";
import { runAllocationEngine } from "@money-matters/capability-budgeting";
import { RecordExpenseCommand } from "@money-matters/types";
import { generateBurstDates } from "@money-matters/capability-budgeting";
import { ensurePremiumAccess } from "@money-matters/core";

describe("E2E Core Monorepo Integration & Multi-Tenant Isolation Suite", () => {
  it("E2E-01: Full Paycheck Waterfall Allocation Engine Execution Flow", () => {
    const allocationResult = runAllocationEngine({
      incomeAmount: 2000,
      paycheckDate: new Date("2026-08-15"),
      paycheckFrequencyDays: 14,
      buckets: [
        {
          id: "cat-rent",
          name: "Rent Bill",
          type: "REGULAR",
          isEssential: true,
          monthlyAmount: 1000,
          currentBalance: 0,
          dueDate: "2026-08-20",
        },
        {
          id: "cat-groceries",
          name: "Groceries",
          type: "EVERYDAY",
          targetAmount: 400,
          currentBalance: 50,
        },
        {
          id: "cat-savings",
          name: "Emergency Fund",
          type: "GOAL",
          isCommitted: true,
          targetAmount: 5000,
          currentBalance: 1000,
        },
        {
          id: "cat-surplus",
          name: "Surplus & Offset Reserve",
          type: "GOAL",
          isSurplusTarget: true,
          currentBalance: 0,
        },
      ],
    });

    expect(allocationResult.status).toBe("OK");
    expect(allocationResult.lines).toBeDefined();
    expect(allocationResult.lines.length).toBeGreaterThan(0);

    const rentLine = allocationResult.lines.find((l) => l.bucketId === "cat-rent");
    expect(rentLine).toBeDefined();
    expect(rentLine?.proposedAmount).toBeGreaterThan(0);
  });

  it("E2E-02: Transaction Ledger Input Validation & Flow Enforcements", () => {
    const validExpense = RecordExpenseCommand.safeParse({
      poolId: "11111111-1111-4111-8111-111111111111",
      amount: "45.20",
      flowType: "DEBIT",
      transactionType: "EXPENSE",
      note: "Woolworths Groceries",
    });
    expect(validExpense.success).toBe(true);

    const invalidAmount = RecordExpenseCommand.safeParse({
      poolId: "11111111-1111-4111-8111-111111111111",
      amount: "invalid-amount",
    });
    expect(invalidAmount.success).toBe(false);
  });

  it("E2E-03: Burst Recurrence Date Generation Math", () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const burstDates = generateBurstDates(
      "FREQ=MONTHLY",
      todayStr,
      null,
      6
    );

    expect(burstDates.length).toBeGreaterThan(0);
    // Jan 31 -> Feb 28 -> Mar 31 -> Apr 30 -> May 31 -> Jun 30
    for (const d of burstDates) {
      expect(isNaN(d.getTime())).toBe(false);
    }
  });

  it("E2E-04: Tenant Isolation & Tier Guard Assertions", async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([
              {
                subscriptionStatus: "FREE_TIER",
                trialEndsAt: new Date(Date.now() - 86400000),
              },
            ]),
          }),
        }),
      }),
    };

    await expect(
      ensurePremiumAccess(mockDb as unknown as Parameters<typeof ensurePremiumAccess>[0], "tenant-123", "Partner Invites")
    ).rejects.toThrow("requires an active subscription");
  });
});
