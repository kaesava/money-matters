import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import { escapeLikePattern, searchTransactionsQuery } from "./search-transactions.query.js";

describe("searchTransactionsQuery", () => {
  it("escapes LIKE wildcard characters safely", () => {
    expect(escapeLikePattern("50%_off\\deal")).toBe("50\\%\\_off\\\\deal");
  });

  it("queries transaction ledger with tenant, app, privacy, and limit constraints", async () => {
    const limitMock = vi.fn().mockResolvedValue([{ id: "tx-1", note: "Coffee", amount: "5.50" }]);
    const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
    const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
    const leftJoin2Mock = vi.fn().mockReturnValue({ where: whereMock });
    const leftJoin1Mock = vi.fn().mockReturnValue({ leftJoin: leftJoin2Mock });
    const fromMock = vi.fn().mockReturnValue({ leftJoin: leftJoin1Mock });
    const selectMock = vi.fn().mockReturnValue({ from: fromMock });
    const mockDb = { select: selectMock } as unknown as DbOrTx;

    const results = await searchTransactionsQuery(
      "tenant-1",
      "app-1",
      "$5.50",
      15,
      mockDb,
      undefined,
      undefined,
      "user-1"
    );

    expect(results).toHaveLength(1);
    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(leftJoin1Mock).toHaveBeenCalledTimes(1);
    expect(leftJoin2Mock).toHaveBeenCalledTimes(1);
    expect(whereMock).toHaveBeenCalledTimes(1);
    expect(limitMock).toHaveBeenCalledWith(15);
  });
});
