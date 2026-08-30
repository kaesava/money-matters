import { describe, it, expect, vi } from "vitest";
import { categories, transactionLedger, incomeEvents, expenseEvents, pools, bankAccounts } from "@money-matters/db";
import { listBillCoverageQuery } from "./list-bill-coverage.query";

function createMockDb(
  mockCategories: any[],
  mockTxs: any[],
  mockPaychecks: any[],
  mockUpcomingBills: any[],
  mockPools: any[] = [
    { id: "pool-bills-1", name: "Regular Bills", poolType: "REGULAR", bankAccountId: "acc-1", isPrivate: false }
  ]
) {
  return {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation((table: any) => {
        let data: any[] = [];
        if (table === pools) data = mockPools;
        else if (table === categories) data = mockCategories;
        else if (table === transactionLedger) data = mockTxs;
        else if (table === incomeEvents) data = mockPaychecks;
        else if (table === expenseEvents) data = mockUpcomingBills;

        const resultPromise = Promise.resolve(data);
        const chainObj: any = {
          orderBy: vi.fn().mockReturnValue(resultPromise),
          then: (cb: any) => resultPromise.then(cb),
          catch: (cb: any) => resultPromise.catch(cb),
        };

        return {
          innerJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockReturnValue(resultPromise),
          })),
          where: vi.fn().mockReturnValue(chainObj),
          orderBy: vi.fn().mockReturnValue(resultPromise),
          then: (cb: any) => resultPromise.then(cb),
          catch: (cb: any) => resultPromise.catch(cb),
        };
      }),
    })),
  };
}

describe("listBillCoverageQuery", () => {
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const appId = "00000000-0000-0000-0000-000000000002";

  it("returns NO_SCHEDULE for bill categories with no upcoming events", async () => {
    const mockCategories = [
      { id: "cat-1", name: "Netflix", type: "REGULAR", poolId: "pool-bills-1", monthlyAmount: "20.00" },
    ];
    const mockTxs: any[] = [];
    const mockPaychecks: any[] = [];
    const mockUpcomingBills: any[] = [];

    const mockPools = [
      { id: "pool-bills-1", name: "Netflix", poolType: "REGULAR", bankAccountId: "acc-1", isPrivate: false }
    ];
    const mockDb = createMockDb(mockCategories, mockTxs, mockPaychecks, mockUpcomingBills, mockPools);

    const result = await listBillCoverageQuery(tenantId, appId, mockDb as any);

    expect(result).toBeDefined();
    expect(result.billsPoolBalance).toBe(0);
    expect(result.items.length).toBe(1);
    expect(result.items[0].poolName || result.items[0].categoryName).toBe("Netflix");
    expect(result.items[0].coverageStatus).toBe("NO_SCHEDULE");
    expect(result.items[0].shortfallAmount).toBeNull();
  });

  it("returns COVERED when bills pool balance is sufficient for upcoming bills", async () => {
    const mockCategories = [
      { id: "cat-1", name: "Power", type: "REGULAR", monthlyAmount: "150.00" },
    ];
    const mockTxs = [
      { poolId: "pool-bills-1", categoryId: "cat-1", amount: "200.00", flowType: "CREDIT" },
    ];
    const mockPaychecks = [
      { expectedDate: "2026-09-01", expectedAmount: "2000.00", status: "UPCOMING" },
    ];
    const mockUpcomingBills = [
      { poolId: "pool-bills-1", categoryId: "cat-1", expectedDate: "2026-08-28", expectedAmount: "150.00", status: "UPCOMING" },
    ];

    const mockDb = createMockDb(mockCategories, mockTxs, mockPaychecks, mockUpcomingBills);

    const result = await listBillCoverageQuery(tenantId, appId, mockDb as any);

    expect(result.billsPoolBalance).toBe(200);
    expect(result.totalUpcomingBeforePayday).toBe(150);
    expect(result.items[0].coverageStatus).toBe("COVERED");
    expect(result.items[0].shortfallAmount).toBeNull();
    expect(result.items[0].nextDueDate).toBe("2026-08-28");
    expect(result.items[0].nextDueAmount).toBe("150.00");
  });

  it("returns SHORT_BY when bills pool balance is insufficient for upcoming bills", async () => {
    const mockCategories = [
      { id: "cat-1", name: "Rent", type: "REGULAR", monthlyAmount: "500.00" },
    ];
    const mockTxs = [
      { poolId: "pool-bills-1", categoryId: "cat-1", amount: "100.00", flowType: "CREDIT" },
    ];
    const mockPaychecks = [
      { expectedDate: "2026-09-01", expectedAmount: "2000.00", status: "UPCOMING" },
    ];
    const mockUpcomingBills = [
      { poolId: "pool-bills-1", categoryId: "cat-1", expectedDate: "2026-08-28", expectedAmount: "500.00", status: "UPCOMING" },
    ];

    const mockDb = createMockDb(mockCategories, mockTxs, mockPaychecks, mockUpcomingBills);

    const result = await listBillCoverageQuery(tenantId, appId, mockDb as any);

    expect(result.billsPoolBalance).toBe(100);
    expect(result.totalUpcomingBeforePayday).toBe(500);
    expect(result.items[0].coverageStatus).toBe("SHORT_BY");
    expect(result.items[0].shortfallAmount).toBe("400.00");
  });
});
