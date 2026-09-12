import { describe, it, expect, vi } from "vitest";
import { pools, transactionLedger } from "@money-matters/db";
import { moveMoneyCommand } from "./move-money.command";

vi.mock("@money-matters/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@money-matters/db")>();
  return {
    ...actual,
    getPoolBalancesMap: vi.fn().mockResolvedValue({
      "pool-src": 500,
      "pool-dst": 100,
    }),
  };
});

describe("moveMoneyCommand", () => {
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const appId = "00000000-0000-0000-0000-000000000002";
  const userId = "00000000-0000-0000-0000-000000000003";

  it("throws if source and destination pools are identical", async () => {
    const mockDb: any = {};
    await expect(
      moveMoneyCommand(
        { sourcePoolId: "pool-1", destinationPoolId: "pool-1", amount: "50.00" },
        tenantId,
        appId,
        userId,
        mockDb
      )
    ).rejects.toThrow("Cannot move money to the same pool.");
  });

  it("generates directional notes when no custom note is provided", async () => {
    let insertedRows: any[] = [];
    const mockTx: any = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation((condition: any) => {
            return Promise.resolve([
              { id: "pool-src", name: "Everyday Expenses" },
            ]);
          }),
        })),
      })),
      insert: vi.fn().mockImplementation((table: any) => ({
        values: vi.fn().mockImplementation((vals: any) => {
          insertedRows = vals;
          return Promise.resolve(vals);
        }),
      })),
    };

    // Make select return sourcePool then destPool
    let callCount = 0;
    mockTx.select = vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([{ id: "pool-src", name: "Everyday" }]);
          }
          return Promise.resolve([{ id: "pool-dst", name: "Holiday Savings" }]);
        }),
      })),
    }));

    const mockDb: any = {
      transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        return cb(mockTx);
      }),
    };

    const res = await moveMoneyCommand(
      { sourcePoolId: "pool-src", destinationPoolId: "pool-dst", amount: "50.00" },
      tenantId,
      appId,
      userId,
      mockDb
    );

    expect(res.success).toBe(true);
    expect(insertedRows).toHaveLength(2);
    // Source pool debit
    expect(insertedRows[0].poolId).toBe("pool-src");
    expect(insertedRows[0].flowType).toBe("DEBIT");
    expect(insertedRows[0].note).toBe("Transfer to Holiday Savings");
    // Destination pool credit
    expect(insertedRows[1].poolId).toBe("pool-dst");
    expect(insertedRows[1].flowType).toBe("CREDIT");
    expect(insertedRows[1].note).toBe("Transfer from Everyday");
  });

  it("preserves custom user note override when provided", async () => {
    let insertedRows: any[] = [];
    let callCount = 0;
    const mockTx: any = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve([{ id: "pool-src", name: "Everyday" }]);
            }
            return Promise.resolve([{ id: "pool-dst", name: "Bills Buffer" }]);
          }),
        })),
      })),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((vals: any) => {
          insertedRows = vals;
          return Promise.resolve(vals);
        }),
      })),
    };

    const mockDb: any = {
      transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        return cb(mockTx);
      }),
    };

    const res = await moveMoneyCommand(
      {
        sourcePoolId: "pool-src",
        destinationPoolId: "pool-dst",
        amount: "75.00",
        note: "Top up car insurance fund",
      },
      tenantId,
      appId,
      userId,
      mockDb
    );

    expect(res.success).toBe(true);
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0].note).toBe("Top up car insurance fund");
    expect(insertedRows[1].note).toBe("Top up car insurance fund");
  });
});
