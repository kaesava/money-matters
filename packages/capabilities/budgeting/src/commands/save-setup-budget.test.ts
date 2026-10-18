import { describe, it, expect, vi } from "vitest";
import { saveSetupBudgetHandler } from "./save-setup-budget.command";
import { envelopes, bankAccounts, incomeSources, expenseEvents, incomeEvents, transactionLedger, tenants } from "@money-matters/db";

vi.mock("@money-matters/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@money-matters/db")>();
  return {
    ...actual,
    getEnvelopeBalancesMap: vi.fn().mockImplementation(async () => ({
      "env-holiday": 1200,
      "env-zero": 0,
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
    envelopes?: any[];
    incomes?: any[];
    expenseSources?: any[];
    prefs?: any[];
  }) => {
    insertedRows = {};
    updatedRows = {};

    const mockDb: any = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: any) => ({
          where: vi.fn().mockImplementation(() => {
            if (table === bankAccounts) return Promise.resolve(existingData?.accounts || []);
            if (table === envelopes) return Promise.resolve(existingData?.envelopes || []);
            if (table === incomeSources) return Promise.resolve(existingData?.incomes || []);
            if (table === expenseEvents) return Promise.resolve(existingData?.expenseSources || []);
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
          } else if (table === envelopes) {
            insertedRows["envelopes"] = items;
          } else if (table === incomeSources) {
            insertedRows["income_sources"] = items;
          } else if (table === incomeEvents) {
            insertedRows["income_events"] = items;
          } else if (table === expenseEvents) {
            insertedRows["expense_events"] = items;
          }
          return Promise.resolve(vals);
        }),
      })),
      update: vi.fn().mockImplementation((table: any) => ({
        set: vi.fn().mockImplementation((setVals: any) => ({
          where: vi.fn().mockImplementation(() => {
            const tableName = table === tenants ? "tenants" : table?.name || "unknown";
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
          { name: "Salary", type: "SALARY", amount: "3200.00", frequency: "FORTNIGHTLY", incomeType: "SALARIED" },
        ],
        bankAccounts: [
          { name: "Everyday Card", bankProvider: "Other", accountType: "EVERYDAY", lastKnownBalance: "1000.00", unbudgetedBuffer: "0.00", isPrivate: false },
          { name: "Bills Account", bankProvider: "Other", accountType: "SAVINGS", lastKnownBalance: "2500.00", unbudgetedBuffer: "0.00", isPrivate: false },
        ],
        envelopes: [
          { name: "Everyday Spending", envelopeType: "EVERYDAY", monthlyAmount: "600.00", isSurplusTarget: false, isCommitted: false, isPrivate: false, orderIndex: 0 },
          { name: "Electricity", envelopeType: "SCHEDULED_BILL", monthlyAmount: "150.00", enteredAmount: "150.00", budgetFrequency: "MONTHLY", isSurplusTarget: false, isCommitted: true, isPrivate: false, orderIndex: 1 },
          { name: "Emergency Reserve", envelopeType: "ONGOING_GOAL", targetAmount: "10000.00", isSurplusTarget: true, isCommitted: true, isPrivate: false, orderIndex: 2 },
        ],
        archivedEnvelopeIds: [],
      },
      appId,
      userId,
      tenantId
    );

    expect(result.success).toBe(true);
    expect(result.persistedCounts.incomes).toBe(1);
    expect(result.persistedCounts.bankAccounts).toBe(2);
    expect(result.persistedCounts.envelopes).toBe(3);
    expect(result.persistedCounts.expenseSources).toBe(12);
    expect(insertedRows["expense_events"]).toHaveLength(12);
    expect(insertedRows["income_events"]).toHaveLength(27);
    expect(updatedRows["tenants"]).toBeDefined();
    expect(updatedRows["tenants"][0].setupStatus).toBe("COMPLETED");
  });

  it("synchronizes pending events when existing envelope amount changes and archives pending events for archived envelopes", async () => {
    const existingEnvId = "00000000-0000-0000-0000-000000000010";

    const mockDb = createMockDb({
      envelopes: [{ id: existingEnvId, name: "Electricity", envelopeType: "SCHEDULED_BILL", monthlyAmount: "150.00" }],
      expenseSources: [{ id: "evt-1", envelopeId: existingEnvId, status: "PENDING" }],
    });
    const handler = saveSetupBudgetHandler(mockDb);

    const result = await handler(
      {
        incomes: [{ name: "Salary", type: "SALARY", amount: "3200.00", frequency: "FORTNIGHTLY", incomeType: "SALARIED" }],
        bankAccounts: [{ name: "Main", bankProvider: "CBA", lastKnownBalance: "1000.00", unbudgetedBuffer: "0.00", isPrivate: false }],
        envelopes: [
          { id: existingEnvId, name: "Electricity", envelopeType: "SCHEDULED_BILL", monthlyAmount: "180.00", enteredAmount: "180.00", budgetFrequency: "MONTHLY", isSurplusTarget: false, isCommitted: false, isPrivate: false, orderIndex: 0 },
          { name: "Gas", envelopeType: "SCHEDULED_BILL", monthlyAmount: "60.00", enteredAmount: "60.00", budgetFrequency: "MONTHLY", isSurplusTarget: false, isCommitted: false, isPrivate: false, orderIndex: 1 },
        ],
        archivedEnvelopeIds: [],
      },
      appId,
      userId,
      tenantId
    );

    expect(result.success).toBe(true);
    expect(result.persistedCounts.expenseSources).toBe(12);
    expect(insertedRows["expense_events"]).toHaveLength(12);
    expect(insertedRows["expense_events"][0].name).toBe("Gas");
  });

  it("prevents archiving the EVERYDAY envelope", async () => {
    const mockDb = createMockDb({
      envelopes: [{ id: "env-everyday", name: "Everyday Spending", envelopeType: "EVERYDAY", isPrivate: false }],
    });
    const handler = saveSetupBudgetHandler(mockDb);

    await expect(
      handler(
        {
          incomes: [{ name: "Salary", type: "SALARY", amount: "3000.00", frequency: "MONTHLY", incomeType: "SALARIED" }],
          bankAccounts: [{ name: "Account", bankProvider: "CBA", lastKnownBalance: "500.00", unbudgetedBuffer: "0.00", isPrivate: false }],
          envelopes: [{ id: "env-everyday", name: "Everyday Spending", envelopeType: "EVERYDAY", isSurplusTarget: false, isCommitted: false, isPrivate: false, orderIndex: 0 }],
          archivedEnvelopeIds: ["env-everyday"],
        },
        appId,
        userId,
        tenantId
      )
    ).rejects.toThrow("The default Everyday envelope cannot be deleted or archived.");
  });

  it("executes an atomic balance sweep when archiving an envelope with positive balance", async () => {
    const mockDb = createMockDb({
      envelopes: [
        { id: "env-everyday", name: "Everyday Spending", envelopeType: "EVERYDAY" },
        { id: "env-emergency", name: "Emergency Reserve", envelopeType: "ONGOING_GOAL", isSurplusTarget: true },
        { id: "env-holiday", name: "Holiday Fund", envelopeType: "TARGET_GOAL" },
      ],
    });
    const handler = saveSetupBudgetHandler(mockDb);

    const result = await handler(
      {
        incomes: [{ name: "Salary", type: "SALARY", amount: "3000.00", frequency: "MONTHLY", incomeType: "SALARIED" }],
        bankAccounts: [{ name: "Account", bankProvider: "CBA", lastKnownBalance: "500.00", unbudgetedBuffer: "0.00", isPrivate: false }],
        envelopes: [
          { id: "env-everyday", name: "Everyday Spending", envelopeType: "EVERYDAY", isSurplusTarget: false, isCommitted: false, isPrivate: false, orderIndex: 0 },
          { id: "env-emergency", name: "Emergency Reserve", envelopeType: "ONGOING_GOAL", isSurplusTarget: true, isCommitted: true, isPrivate: false, orderIndex: 1 },
        ],
        archivedEnvelopeIds: ["env-holiday"],
      },
      appId,
      userId,
      tenantId
    );

    expect(result.success).toBe(true);
    expect(result.persistedCounts.sweptEnvelopes).toBe(1);
    expect(result.persistedCounts.sweptTotalAmount).toBe(1200);

    const ledgerInserts = insertedRows["transaction_ledger"] || [];
    expect(ledgerInserts).toHaveLength(2);
    expect(ledgerInserts[0].flowType).toBe("DEBIT");
    expect(ledgerInserts[0].amount).toBe("1200.00");
    expect(ledgerInserts[1].flowType).toBe("CREDIT");
    expect(ledgerInserts[1].envelopeId).toBe("env-emergency");
  });
});
