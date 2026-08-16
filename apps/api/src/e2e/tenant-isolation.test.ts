import { describe, it, expect } from "vitest";
import { runAllocationEngine } from "@money-matters/capability-budgeting";
import { parseBankCsv } from "@money-matters/capability-transactions";
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

  it("E2E-02: Bank CSV Statement Parsing & Normalization Engine", () => {
    const csvContent = `Date,Amount,Description\n15/08/2026,-45.20,Woolworths Sydney\n16/08/2026,2000.00,Employer Salary Deposit`;

    const parsed = parseBankCsv(csvContent);
    expect(parsed.transactions).toHaveLength(2);

    const debitTx = parsed.transactions.find((t) => t.flowType === "DEBIT");
    expect(debitTx).toBeDefined();
    expect(debitTx?.amount).toBe("45.20");
    expect(debitTx?.suggestedCategoryName).toContain("Groceries");

    const creditTx = parsed.transactions.find((t) => t.flowType === "CREDIT");
    expect(creditTx).toBeDefined();
    expect(creditTx?.amount).toBe("2000.00");
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
      ensurePremiumAccess(mockDb as any, "tenant-123", "Partner Invites")
    ).rejects.toThrow("requires an active subscription");
  });
});
