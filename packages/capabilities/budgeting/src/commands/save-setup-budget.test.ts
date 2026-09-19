import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveSetupBudgetHandler } from "./save-setup-budget.command";
import { pools, categories, bankAccounts, incomeSources, transactionLedger } from "@money-matters/db";

vi.mock("@money-matters/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@money-matters/db")>();
  return {
    ...actual,
    getPoolBalancesMap: vi.fn().mockImplementation(async () => ({
      "pool-holiday": 1200,
      "pool-zero": 0,
    })),
  };
});

describe("saveSetupBudgetHandler", () => {
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const appId = "00000000-0000-0000-0000-000000000002";
  const userId = "00000000-0000-0000-0000-000000000003";

  let insertedRows: Record<string, any[]> = {};
  let updatedRows: Record<string, any[]> = {};

  const createMockDb = (existingData?: {
    accounts?: any[];
    pools?: any[];
    categories?: any[];
    incomes?: any[];
    prefs?: any[];
  }) => {
    insertedRows = {};
    updatedRows = {};

    const mockDb: any = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: any) => ({
          where: vi.fn().mockImplementation(() => {
            if (table === bankAccounts) return Promise.resolve(existingData?.accounts || []);
            if (table === pools) return Promise.resolve(existingData?.pools || []);
            if (table === categories) return Promise.resolve(existingData?.categories || []);
            if (table === incomeSources) return Promise.resolve(existingData?.incomes || []);
            return Promise.resolve(existingData?.prefs || []);
          }),
          limit: vi.fn().mockImplementation(() => Promise.resolve(existingData?.prefs || [])),
        })),
      })),
      insert: vi.fn().mockImplementation((table: any) => ({
        values: vi.fn().mockImplementation((vals: any) => {
          const items = Array.isArray(vals) ? vals : [vals];
          if (table === transactionLedger) {
            insertedRows["transaction_ledger"] = items;
          } else if (table === bankAccounts) {
            insertedRows["bank_accounts"] = items;
          } else if (table === pools) {
            insertedRows["pools"] = items;
          } else if (table === categories) {
            insertedRows["categories"] = items;
          } else if (table === incomeSources) {
            insertedRows["income_sources"] = items;
          }
          return Promise.resolve(vals);
        }),
      })),
      update: vi.fn().mockImplementation((table: any) => ({
        set: vi.fn().mockImplementation((setVals: any) => ({
          where: vi.fn().mockImplementation(() => {
            const tableName = table?.name || "unknown";
            updatedRows[tableName] = updatedRows[tableName] || [];
            updatedRows[tableName].push(setVals);
            return Promise.resolve([setVals]);
          }),
        })),
      })),
    };

    mockDb.transaction = vi.fn().mockImplementation((cb: any) => cb(mockDb));
    return mockDb;
  };

  it("persists initial setup configuration cleanly", async () => {
    const mockDb = createMockDb();
    const handler = saveSetupBudgetHandler(mockDb);

    const result = await handler(
      {
        incomes: [
          { name: "Salary", type: "SALARY", amount: "3200.00", frequency: "FORTNIGHTLY" },
        ],
        bankAccounts: [
          { name: "Everyday Card", bankProvider: "CBA", lastKnownBalance: "1000.00", unbudgetedBuffer: "0.00", isPrivate: false },
          { name: "Bills Account", bankProvider: "CBA", lastKnownBalance: "2500.00", unbudgetedBuffer: "0.00", isPrivate: false },
        ],
        pools: [
          { name: "Everyday Spending", poolType: "EVERYDAY", everydayAllowanceAmount: "600.00", isSurplusTarget: false, isCommitted: false, isPrivate: false },
          { name: "Regular Bills", poolType: "REGULAR", isSurplusTarget: false, isCommitted: false, isPrivate: false },
          { name: "Emergency Reserve", poolType: "GOAL", targetAmount: "10000.00", isSurplusTarget: true, isCommitted: true, isPrivate: false },
        ],
        categories: [
          { name: "Groceries", poolType: "EVERYDAY", monthlyAmount: "600.00", icon: "shopping-cart", budgetFrequency: "MONTHLY", isEssential: true },
          { name: "Electricity", poolType: "REGULAR", monthlyAmount: "150.00", icon: "zap", budgetFrequency: "MONTHLY", isEssential: true },
        ],
        archivedPools: [],
        archivedCategoryIds: [],
        archetypeApplied: "AUSSIE_2_ACCOUNT",
      },
      appId,
      userId,
      tenantId
    );

    expect(result.success).toBe(true);
    expect(result.persistedCounts.incomes).toBe(1);
    expect(result.persistedCounts.bankAccounts).toBe(2);
    expect(result.persistedCounts.pools).toBe(3);
    expect(result.persistedCounts.categories).toBe(2);
  });

  it("prevents archiving the EVERYDAY pool", async () => {
    const mockDb = createMockDb({
      pools: [{ id: "pool-everyday", name: "Everyday Spending", poolType: "EVERYDAY" }],
    });
    const handler = saveSetupBudgetHandler(mockDb);

    await expect(
      handler(
        {
          incomes: [{ name: "Salary", type: "SALARY", amount: "3000.00", frequency: "MONTHLY" }],
          bankAccounts: [{ name: "Account", bankProvider: "CBA", lastKnownBalance: "500.00", unbudgetedBuffer: "0.00", isPrivate: false }],
          pools: [{ id: "pool-everyday", name: "Everyday Spending", poolType: "EVERYDAY", isSurplusTarget: false, isCommitted: false, isPrivate: false }],
          categories: [],
          archivedPools: [{ poolId: "pool-everyday" }],
          archivedCategoryIds: [],
        },
        appId,
        userId,
        tenantId
      )
    ).rejects.toThrow("The default Everyday pool cannot be deleted or archived.");
  });

  it("executes an atomic balance sweep when archiving a pool with positive balance", async () => {
    const mockDb = createMockDb({
      pools: [
        { id: "pool-everyday", name: "Everyday Spending", poolType: "EVERYDAY" },
        { id: "pool-emergency", name: "Emergency Reserve", poolType: "GOAL", isSurplusTarget: true },
        { id: "pool-holiday", name: "Holiday Fund", poolType: "GOAL" },
      ],
    });
    const handler = saveSetupBudgetHandler(mockDb);

    const result = await handler(
      {
        incomes: [{ name: "Salary", type: "SALARY", amount: "3000.00", frequency: "MONTHLY" }],
        bankAccounts: [{ name: "Account", bankProvider: "CBA", lastKnownBalance: "500.00", unbudgetedBuffer: "0.00", isPrivate: false }],
        pools: [
          { id: "pool-everyday", name: "Everyday Spending", poolType: "EVERYDAY", isSurplusTarget: false, isCommitted: false, isPrivate: false },
          { id: "pool-emergency", name: "Emergency Reserve", poolType: "GOAL", isSurplusTarget: true, isCommitted: true, isPrivate: false },
        ],
        categories: [],
        archivedPools: [{ poolId: "pool-holiday", sweepDestinationPoolId: "pool-emergency" }],
        archivedCategoryIds: [],
      },
      appId,
      userId,
      tenantId
    );

    expect(result.success).toBe(true);
    expect(result.persistedCounts.sweptPools).toBe(1);
    expect(result.persistedCounts.sweptTotalAmount).toBe(1200);

    // Verify ledger transactions were created for the sweep
    const ledgerInserts = insertedRows["transaction_ledger"] || [];
    expect(ledgerInserts).toHaveLength(2);
    expect(ledgerInserts[0].flowType).toBe("DEBIT");
    expect(ledgerInserts[0].amount).toBe("1200.00");
    expect(ledgerInserts[1].flowType).toBe("CREDIT");
    expect(ledgerInserts[1].poolId).toBe("pool-emergency");
  });
});
