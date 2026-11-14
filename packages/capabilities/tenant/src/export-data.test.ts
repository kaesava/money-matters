import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import { exportDataHandler } from "./export-data.js";

describe("exportDataHandler", () => {
  it("filters out partner private bank accounts, envelopes, ledger rows, and events", async () => {
    const responses = [
      [{ id: "user-1", email: "alice@example.com", displayName: "Alice" }], // users
      [{ id: "tenant-1", name: "Home" }], // tenants
      [
        { id: "ba-shared", name: "Shared", isPrivate: false, userId: null },
        { id: "ba-alice", name: "Alice Private", isPrivate: true, userId: "user-1" },
        { id: "ba-bob", name: "Bob Private", isPrivate: true, userId: "user-2" },
      ], // bankAccounts
      [
        { id: "env-shared", name: "Groceries", isPrivate: false, userId: null },
        { id: "env-bob", name: "Bob Secret", isPrivate: true, userId: "user-2" },
      ], // envelopes
      [{ id: "inc-1", receivingAccountId: "ba-shared" }, { id: "inc-bob", receivingAccountId: "ba-bob" }], // incomeSources
      [{ id: "ie-1", incomeSourceId: "inc-1" }, { id: "ie-bob", incomeSourceId: "inc-bob" }], // incomeEvents
      [{ id: "ee-1", envelopeId: "env-shared" }, { id: "ee-bob", envelopeId: "env-bob" }], // expenseEvents
      [{ id: "tx-1", envelopeId: "env-shared", bankAccountId: "ba-shared", note: "=SUM(1,2)" }, { id: "tx-bob", envelopeId: "env-bob", bankAccountId: "ba-bob" }], // transactionLedger
      [{ id: "ap-1", incomeEventId: "ie-1" }, { id: "ap-bob", incomeEventId: "ie-bob" }], // allocationPlans
      [{ id: "apl-1", planId: "ap-1", envelopeId: "env-shared" }, { id: "apl-bob", planId: "ap-bob", envelopeId: "env-bob" }], // allocationPlanLines
    ];

    let callIdx = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        const rows = responses[callIdx++] ?? [];
        const chain = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockImplementation(() => {
            const thenable = Promise.resolve(rows) as Promise<unknown[]> & { limit: () => Promise<unknown[]> };
            thenable.limit = vi.fn().mockResolvedValue(rows);
            return thenable;
          }),
        };
        return chain;
      }),
    };

    const handler = exportDataHandler(mockDb as unknown as DbOrTx);
    const result = await handler("tenant-1", "user-1", "money-matters");

    expect(result.csvFiles["Bank_Accounts.csv"]).toContain("ba-shared");
    expect(result.csvFiles["Bank_Accounts.csv"]).toContain("ba-alice");
    expect(result.csvFiles["Bank_Accounts.csv"]).not.toContain("ba-bob");

    expect(result.csvFiles["Envelopes.csv"]).toContain("env-shared");
    expect(result.csvFiles["Envelopes.csv"]).not.toContain("env-bob");

    expect(result.csvFiles["Transactions_Ledger.csv"]).toContain("tx-1");
    expect(result.csvFiles["Transactions_Ledger.csv"]).not.toContain("tx-bob");

    expect(result.csvFiles["Income_Split_Plans.csv"]).toContain("ap-1");
    expect(result.csvFiles["Income_Split_Plans.csv"]).not.toContain("ap-bob");

    expect(result.csvFiles["Income_Split_Plan_Lines.csv"]).toContain("apl-1");
    expect(result.csvFiles["Income_Split_Plan_Lines.csv"]).not.toContain("apl-bob");
  });
});
