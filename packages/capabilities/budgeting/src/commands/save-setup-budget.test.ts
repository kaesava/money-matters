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
        from: vi.fn().mockImplementation((table: any) => {
          const getData = () => {
            if (table === bankAccounts) return existingData?.accounts || [];
            if (table === envelopes) return existingData?.envelopes || [];
            if (table === incomeSources) return existingData?.incomes || [];
            if (table === expenseEvents) return existingData?.expenseSources || [];
            if (table === tenants) return [{ timezone: "Australia/Sydney" }];
            return existingData?.prefs || [];
          };
          const queryResult: any = Promise.resolve(getData());
          queryResult.limit = vi.fn().mockImplementation(() => Promise.resolve(getData()));
          return {
            where: vi.fn().mockReturnValue(queryResult),
            limit: vi.fn().mockImplementation(() => Promise.resolve(getData())),
          };
        }),
      })),
      insert: vi.fn().mockImplementation((table: any) => ({
        values: vi.fn().mockImplementation((vals: any) => {
          const items = Array.isArray(vals) ? vals : [vals];
          if (table === transactionLedger) {
            insertedRows["transaction_ledger"] = [...(insertedRows["transaction_ledger"] || []), ...items];
          } else if (table === bankAccounts) {
            insertedRows["bank_accounts"] = [...(insertedRows["bank_accounts"] || []), ...items];
          } else if (table === envelopes) {
            insertedRows["envelopes"] = [...(insertedRows["envelopes"] || []), ...items];
          } else if (table === incomeSources) {
            insertedRows["income_sources"] = [...(insertedRows["income_sources"] || []), ...items];
          } else if (table === incomeEvents) {
            insertedRows["income_events"] = [...(insertedRows["income_events"] || []), ...items];
          } else if (table === expenseEvents) {
            insertedRows["expense_events"] = [...(insertedRows["expense_events"] || []), ...items];
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
      delete: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockResolvedValue([]),
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
          { name: "Everyday Spending", envelopeType: "EVERYDAY", monthlyAmount: "600.00", isSurplusTarget: false, isPriority: false, isPrivate: false, orderIndex: 0 },
          { name: "Electricity", envelopeType: "BILL", fundingMode: "RECURRING", monthlyAmount: "150.00", enteredAmount: "150.00", budgetFrequency: "MONTHLY", isSurplusTarget: false, isPriority: true, isPrivate: false, orderIndex: 1 },
          { name: "Emergency Reserve", envelopeType: "GOAL", fundingMode: "RECURRING", targetAmount: "10000.00", isSurplusTarget: true, isPriority: true, isPrivate: false, orderIndex: 2 },
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
      envelopes: [{ id: existingEnvId, name: "Electricity", envelopeType: "BILL", fundingMode: "RECURRING", budgetFrequency: "MONTHLY", monthlyAmount: "150.00" }],
      expenseSources: [{ id: "evt-1", envelopeId: existingEnvId, status: "PENDING" }],
    });
    const handler = saveSetupBudgetHandler(mockDb);

    const result = await handler(
      {
        incomes: [{ name: "Salary", type: "SALARY", amount: "3200.00", frequency: "FORTNIGHTLY", incomeType: "SALARIED" }],
        bankAccounts: [{ name: "Main", bankProvider: "CBA", lastKnownBalance: "1000.00", unbudgetedBuffer: "0.00", isPrivate: false }],
        envelopes: [
          { id: existingEnvId, name: "Electricity", envelopeType: "BILL", fundingMode: "RECURRING", monthlyAmount: "180.00", enteredAmount: "180.00", budgetFrequency: "MONTHLY", isSurplusTarget: false, isPriority: false, isPrivate: false, orderIndex: 0 },
          { name: "Gas", envelopeType: "BILL", fundingMode: "RECURRING", monthlyAmount: "60.00", enteredAmount: "60.00", budgetFrequency: "MONTHLY", isSurplusTarget: false, isPriority: false, isPrivate: false, orderIndex: 1 },
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
          envelopes: [{ id: "env-everyday", name: "Everyday Spending", envelopeType: "EVERYDAY", isSurplusTarget: false, isPriority: false, isPrivate: false, orderIndex: 0 }],
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
        { id: "env-emergency", name: "Emergency Reserve", envelopeType: "GOAL", fundingMode: "RECURRING", isSurplusTarget: true },
        { id: "env-holiday", name: "Holiday Fund", envelopeType: "GOAL", fundingMode: "TARGET_BALANCE" },
      ],
    });
    const handler = saveSetupBudgetHandler(mockDb);

    const result = await handler(
      {
        incomes: [{ name: "Salary", type: "SALARY", amount: "3000.00", frequency: "MONTHLY", incomeType: "SALARIED" }],
        bankAccounts: [{ name: "Account", bankProvider: "CBA", lastKnownBalance: "500.00", unbudgetedBuffer: "0.00", isPrivate: false }],
        envelopes: [
          { id: "env-everyday", name: "Everyday Spending", envelopeType: "EVERYDAY", isSurplusTarget: false, isPriority: false, isPrivate: false, orderIndex: 0 },
          { id: "env-emergency", name: "Emergency Reserve", envelopeType: "GOAL", fundingMode: "RECURRING", isSurplusTarget: true, isPriority: true, isPrivate: false, orderIndex: 1 },
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

  it("updates pre-seeded envelopes in place without duplicates when setup payload omits IDs", async () => {
    const mockDb = createMockDb({
      accounts: [
        { id: "acc-seeded", name: "Main Everyday Account", bankProvider: "Other", accountType: "EVERYDAY" },
      ],
      envelopes: [
        { id: "env-seed-everyday", name: "Everyday Spending", envelopeType: "EVERYDAY", bankAccountId: "acc-seeded" },
        { id: "env-seed-rent", name: "Rent & Housing", envelopeType: "BILL", fundingMode: "RECURRING", bankAccountId: "acc-seeded" },
        { id: "env-seed-utils", name: "Electricity & Utilities", envelopeType: "BILL", fundingMode: "RECURRING", bankAccountId: "acc-seeded" },
        { id: "env-seed-emergency", name: "Emergency Reserve", envelopeType: "GOAL", fundingMode: "RECURRING", bankAccountId: "acc-seeded" },
      ],
    });
    const handler = saveSetupBudgetHandler(mockDb);

    const result = await handler(
      {
        incomes: [{ name: "Salary", type: "SALARY", amount: "3000.00", frequency: "MONTHLY", incomeType: "SALARIED" }],
        bankAccounts: [
          // Client sends no ID on first account
          { name: "Main Everyday Account", bankProvider: "Other", accountType: "EVERYDAY", lastKnownBalance: "1000.00", unbudgetedBuffer: "0.00", isPrivate: false },
        ],
        envelopes: [
          // Client sends no IDs on pre-seeded envelopes
          { name: "Everyday Spending", envelopeType: "EVERYDAY", monthlyAmount: "1200.00", isSurplusTarget: false, isPriority: false, isPrivate: false, orderIndex: 0 },
          { name: "Rent & Housing", envelopeType: "BILL", fundingMode: "RECURRING", monthlyAmount: "2400.00", enteredAmount: "2400.00", budgetFrequency: "MONTHLY", isSurplusTarget: false, isPriority: true, isPrivate: false, orderIndex: 1 },
          { name: "Electricity & Utilities", envelopeType: "BILL", fundingMode: "RECURRING", monthlyAmount: "350.00", enteredAmount: "350.00", budgetFrequency: "MONTHLY", isSurplusTarget: false, isPriority: true, isPrivate: false, orderIndex: 2 },
          { name: "Emergency Reserve", envelopeType: "GOAL", fundingMode: "RECURRING", targetAmount: "10000.00", enteredAmount: "300.00", monthlyAmount: "300.00", budgetFrequency: "MONTHLY", isSurplusTarget: true, isPriority: true, isPrivate: false, orderIndex: 3 },
          // Plus 1 brand new goal
          { name: "Family Vacation", envelopeType: "GOAL", fundingMode: "TARGET_BALANCE", targetAmount: "4000.00", monthlyAmount: "333.33", isSurplusTarget: false, isPriority: true, isPrivate: false, orderIndex: 4 },
        ],
      },
      appId,
      userId,
      tenantId
    );

    expect(result.success).toBe(true);
    // Only 1 new envelope (Family Vacation) should be inserted; the 4 pre-seeded should be updated
    const insertedEnvelopes = insertedRows["envelopes"] || [];
    expect(insertedEnvelopes).toHaveLength(1);
    expect(insertedEnvelopes[0].name).toBe("Family Vacation");

    // No new bank account inserted
    const insertedAccounts = insertedRows["bank_accounts"] || [];
    expect(insertedAccounts).toHaveLength(0);
  });

  it("saves first-time setup after minimal workspace seeding with multiple income schedules, bank accounts, envelopes, and burst events", async () => {
    const mockDb = createMockDb({
      accounts: [
        { id: "acc-seeded", name: "Other Financial Institution (Everyday)", bankProvider: "Other", accountType: "EVERYDAY" },
      ],
      envelopes: [
        { id: "env-seed-everyday", name: "Everyday Spending", envelopeType: "EVERYDAY", bankAccountId: "acc-seeded", isSurplusTarget: true, isPrivate: false },
      ],
    });
    const handler = saveSetupBudgetHandler(mockDb);

    const result = await handler(
      {
        incomes: [
          { name: "Primary Salary", type: "SALARY", amount: "3200.00", frequency: "FORTNIGHTLY", rrule: "FREQ=WEEKLY;INTERVAL=2", incomeType: "SALARIED" },
          { name: "Annual Bonus", type: "OTHER", amount: "5000.00", frequency: "ANNUALLY", rrule: "FREQ=YEARLY", incomeType: "SALARIED" },
        ],
        bankAccounts: [
          { id: "acc-seeded", name: "CBA Everyday", bankProvider: "CBA", accountType: "EVERYDAY", lastKnownBalance: "1500.00", unbudgetedBuffer: "0.00", isPrivate: false },
          { name: "High Interest Savings", bankProvider: "CBA", accountType: "SAVINGS", lastKnownBalance: "8000.00", unbudgetedBuffer: "500.00", isPrivate: false },
        ],
        envelopes: [
          { id: "env-seed-everyday", bankAccountId: "acc-seeded", name: "Everyday Spending", envelopeType: "EVERYDAY", fundingMode: "TARGET_BALANCE", monthlyAmount: "2643.33", enteredAmount: "2643.33", budgetFrequency: "MONTHLY", isSurplusTarget: false, isPriority: false, isPrivate: false, orderIndex: 0 },
          { bankAccountId: "acc-seeded", name: "Rent & Housing", envelopeType: "BILL", fundingMode: "RECURRING", monthlyAmount: "2400.00", enteredAmount: "2400.00", budgetFrequency: "MONTHLY", generateEvents: true, isSurplusTarget: false, isPriority: true, isPrivate: false, orderIndex: 1 },
          { bankAccountId: "acc-seeded", name: "Council Rates", envelopeType: "BILL", fundingMode: "RECURRING", monthlyAmount: "170.00", enteredAmount: "170.00", budgetFrequency: "QUARTERLY", generateEvents: true, isSurplusTarget: false, isPriority: true, isPrivate: false, orderIndex: 2 },
          { bankAccountId: "acc-seeded", name: "Emergency Reserve", envelopeType: "GOAL", fundingMode: "RECURRING", targetAmount: "10000.00", monthlyAmount: "300.00", enteredAmount: "300.00", budgetFrequency: "MONTHLY", isSurplusTarget: true, isPriority: true, isPrivate: false, orderIndex: 3 },
        ],
      },
      appId,
      userId,
      tenantId
    );

    expect(result.success).toBe(true);
    expect(result.persistedCounts.incomes).toBe(2);
    expect(result.persistedCounts.bankAccounts).toBe(2);
    expect(result.persistedCounts.envelopes).toBe(4);
    expect(insertedRows["bank_accounts"]).toHaveLength(1);
    expect(insertedRows["bank_accounts"][0].name).toBe("High Interest Savings");
    expect(insertedRows["envelopes"]).toHaveLength(3);
    expect(insertedRows["envelopes"].map((e) => e.name)).toEqual([
      "Rent & Housing",
      "Council Rates",
      "Emergency Reserve",
    ]);
    expect(insertedRows["envelopes"].every((e) => e.bankAccountId === "acc-seeded")).toBe(true);
    expect(insertedRows["income_events"].length).toBeGreaterThan(25);
    expect(insertedRows["expense_events"].length).toBe(16); // 12 monthly Rent + 4 quarterly Council Rates
    expect(updatedRows["tenants"][0].setupStatus).toBe("COMPLETED");
  });
});
