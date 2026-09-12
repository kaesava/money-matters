import { describe, it, expect, vi } from "vitest";
import { recordExpenseCommand } from "./commands/record-expense.command.js";
import type { DbOrTx } from "@money-matters/db";

describe("transactions capability", () => {
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const appId = "00000000-0000-0000-0000-000000000002";
  const userId = "00000000-0000-0000-0000-000000000003";

  it("throws error when target pool is not found or unauthorized", async () => {
    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx)),
    } as unknown as DbOrTx;

    await expect(
      recordExpenseCommand(
        { poolId: "p-invalid", amount: "50.00", flowType: "DEBIT", source: "MANUAL" },
        tenantId,
        appId,
        userId,
        mockDb
      )
    ).rejects.toThrow("Pool target invalid or access unauthorized.");
  });

  it("records an expense debit successfully", async () => {
    const mockExpense = { id: "tx-1", poolId: "p-123", amount: "50.00" };
    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: "p-123", tenantId }]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockExpense]),
        }),
      }),
    };
    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx)),
    } as unknown as DbOrTx;

    const result = await recordExpenseCommand(
      { poolId: "p-123", amount: "50.00", flowType: "DEBIT", source: "MANUAL" },
      tenantId,
      appId,
      userId,
      mockDb
    );

    expect(result).toEqual(mockExpense);
  });
});
