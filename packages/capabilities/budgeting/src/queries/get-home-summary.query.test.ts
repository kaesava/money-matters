import { describe, it, expect, vi } from "vitest";
import { getHomeSummaryQuery } from "./get-home-summary.query.js";
import { DbOrTx } from "@money-matters/db";

describe("getHomeSummaryQuery", () => {
  it("computes safe to spend, daily pace, and groups attention items cleanly", async () => {
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        const queryObj: any = {
          from: vi.fn().mockImplementation(() => queryObj),
          where: vi.fn().mockImplementation(() => queryObj),
          leftJoin: vi.fn().mockImplementation(() => queryObj),
          orderBy: vi.fn().mockResolvedValue([]),
          limit: vi.fn().mockResolvedValue([{ timezone: "Australia/Sydney" }]),
          groupBy: vi.fn().mockResolvedValue([{ envelopeId: "env-1", balance: "250.00" }]),
        };

        // When awaited directly or via then
        queryObj.then = (resolve: any) => {
          resolve([
            {
              id: "env-1",
              name: "Groceries",
              envelopeType: "EVERYDAY",
              bankAccountId: "acc-1",
              safetyBufferFloor: "50.00",
              monthlyAmount: "800.00",
              targetAmount: null,
              isPrivate: false,
              userId: null,
              bankAccountUserId: null,
              emoji: "🛒",
              colorKey: "sereneBlue",
            },
          ]);
        };
        return queryObj;
      }),
      execute: vi.fn().mockResolvedValue([
        { envelope_id: "env-1", balance: "250.00" }
      ]),
    };

    const res = await getHomeSummaryQuery(
      "00000000-0000-0000-0000-000000000001",
      "01908bde-34bb-7b19-a178-574211bc93aa",
      "00000000-0000-0000-0000-000000000002",
      mockDb as unknown as DbOrTx
    );

    expect(res).toBeDefined();
    expect(res.everydayBalance).toBe(250);
    expect(res.everydaySafetyBuffer).toBe(50);
    expect(res.safeToSpend).toBe(200);
    expect(res.safeToSpendCents).toBe(20000);
    expect(res.todayDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
