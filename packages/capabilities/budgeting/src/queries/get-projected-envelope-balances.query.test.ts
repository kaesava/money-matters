import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import * as dbModule from "@money-matters/db";
import { getProjectedPoolBalancesQuery } from "./get-projected-envelope-balances.query.js";

vi.mock("@money-matters/db", async (importOriginal) => {
  const actual = await importOriginal<typeof dbModule>();
  return {
    ...actual,
    getEnvelopeBalancesMap: vi.fn(),
  };
});

describe("getProjectedPoolBalancesQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("excludes partner private envelopes and returns empty columns when no pending incomes exist", async () => {
    vi.mocked(dbModule.getEnvelopeBalancesMap).mockResolvedValue({
      "env-shared": 500,
      "env-partner": 9999,
    });

    const selectResults = [
      [
        {
          id: "env-shared",
          name: "Groceries",
          envelopeType: "SPEND",
          bankAccountId: "ba-1",
          safetyBufferFloor: "0.00",
          monthlyAmount: "400.00",
          enteredAmount: "400.00",
          budgetFrequency: "MONTHLY",
          startDate: null,
          endDate: null,
          rrule: null,
          fundingMode: "FIXED",
          targetAmount: null,
          isPriority: false,
          isSurplusTarget: false,
          isPrivate: false,
          generateEvents: false,
          userId: null,
          orderIndex: 0,
          bankAccountIsPrivate: false,
          bankAccountUserId: null,
        },
        {
          id: "env-partner",
          name: "Partner Secret",
          envelopeType: "SPEND",
          bankAccountId: "ba-2",
          safetyBufferFloor: "0.00",
          monthlyAmount: "100.00",
          enteredAmount: "100.00",
          budgetFrequency: "MONTHLY",
          startDate: null,
          endDate: null,
          rrule: null,
          fundingMode: "FIXED",
          targetAmount: null,
          isPriority: false,
          isSurplusTarget: false,
          isPrivate: true,
          generateEvents: false,
          userId: "user-2",
          orderIndex: 1,
          bankAccountIsPrivate: true,
          bankAccountUserId: "user-2",
        },
      ],
      [{ timezone: "Australia/Sydney" }],
      [], // pending incomes
      [], // active sources
    ];

    let callIdx = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        const rows = selectResults[callIdx++] ?? [];
        const thenable = Promise.resolve(rows) as Promise<unknown[]> & {
          from: ReturnType<typeof vi.fn>;
          leftJoin: ReturnType<typeof vi.fn>;
          innerJoin: ReturnType<typeof vi.fn>;
          where: ReturnType<typeof vi.fn>;
          limit: ReturnType<typeof vi.fn>;
          orderBy: ReturnType<typeof vi.fn>;
        };
        thenable.from = vi.fn().mockReturnValue(thenable);
        thenable.leftJoin = vi.fn().mockReturnValue(thenable);
        thenable.innerJoin = vi.fn().mockReturnValue(thenable);
        thenable.where = vi.fn().mockReturnValue(thenable);
        thenable.orderBy = vi.fn().mockReturnValue(thenable);
        thenable.limit = vi.fn().mockResolvedValue(rows);
        return thenable;
      }),
    };

    const result = await getProjectedPoolBalancesQuery(
      "tenant-1",
      "money-matters",
      "user-1",
      mockDb as unknown as DbOrTx
    );

    expect(result.columns).toEqual([]);
    expect(result.envelopeBalances).toEqual({});
    expect(result.poolBalances).toEqual({});
  });
});
