import { describe, it, expect, vi } from "vitest";
import { transactionLedger, incomeEvents, expenseEvents, envelopes, bankAccounts } from "@money-matters/db";
import { listBillCoverageQuery } from "./list-bill-coverage.query";

function createMockDb(
  mockTxs: any[],
  mockPaychecks: any[],
  mockUpcomingBills: any[],
  mockEnvelopes: any[] = [
    { id: "env-bills-1", name: "Regular Bills", envelopeType: "SCHEDULED_BILL", bankAccountId: "acc-1", isPrivate: false }
  ]
) {
  return {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation((table: any) => {
        let data: any[] = [];
        if (table === envelopes) data = mockEnvelopes;
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
          leftJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockReturnValue(resultPromise),
          })),
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

  it("returns NO_SCHEDULE for bill envelopes with no upcoming events", async () => {
    const mockTxs: any[] = [];
    const mockPaychecks: any[] = [];
    const mockUpcomingBills: any[] = [];
    const mockEnvelopes = [
      { id: "env-bills-1", name: "Netflix", envelopeType: "SCHEDULED_BILL", bankAccountId: "acc-1", isPrivate: false }
    ];
    const mockDb = createMockDb(mockTxs, mockPaychecks, mockUpcomingBills, mockEnvelopes);

    const result = await listBillCoverageQuery(tenantId, appId, mockDb as any);

    expect(result).toBeDefined();
    expect(result.billsPoolBalance).toBe(0);
    expect(result.items.length).toBe(1);
    expect(result.items[0].envelopeName).toBe("Netflix");
    expect(result.items[0].coverageStatus).toBe("NO_SCHEDULE");
    expect(result.items[0].shortfallAmount).toBeNull();
  });

  it("returns COVERED when bills balance is sufficient for upcoming bills", async () => {
    const mockEnvelopes = [
      { id: "env-bills-1", name: "Power", envelopeType: "SCHEDULED_BILL", bankAccountId: "acc-1", isPrivate: false }
    ];
    const mockTxs = [
      { envelopeId: "env-bills-1", amount: "200.00", flowType: "CREDIT" },
    ];
    const mockPaychecks = [
      { expectedDate: "2026-09-01", expectedAmount: "2000.00", status: "PENDING" },
    ];
    const mockUpcomingBills = [
      { envelopeId: "env-bills-1", expectedDate: "2026-08-28", expectedAmount: "150.00", status: "PENDING" },
    ];

    const mockDb = createMockDb(mockTxs, mockPaychecks, mockUpcomingBills, mockEnvelopes);

    const result = await listBillCoverageQuery(tenantId, appId, mockDb as any);

    expect(result.billsPoolBalance).toBe(200);
    expect(result.totalUpcomingBeforePayday).toBe(150);
    expect(result.items[0].coverageStatus).toBe("COVERED");
    expect(result.items[0].shortfallAmount).toBeNull();
    expect(result.items[0].nextDueDate).toBe("2026-08-28");
    expect(result.items[0].nextDueAmount).toBe("150.00");
  });

  it("returns SHORT_BY when bills balance is insufficient for upcoming bills", async () => {
    const mockEnvelopes = [
      { id: "env-bills-1", name: "Rent", envelopeType: "SCHEDULED_BILL", bankAccountId: "acc-1", isPrivate: false }
    ];
    const mockTxs = [
      { envelopeId: "env-bills-1", amount: "100.00", flowType: "CREDIT" },
    ];
    const mockPaychecks = [
      { expectedDate: "2026-09-01", expectedAmount: "2000.00", status: "PENDING" },
    ];
    const mockUpcomingBills = [
      { envelopeId: "env-bills-1", expectedDate: "2026-08-28", expectedAmount: "500.00", status: "PENDING" },
    ];

    const mockDb = createMockDb(mockTxs, mockPaychecks, mockUpcomingBills, mockEnvelopes);

    const result = await listBillCoverageQuery(tenantId, appId, mockDb as any);

    expect(result.billsPoolBalance).toBe(100);
    expect(result.totalUpcomingBeforePayday).toBe(500);
    expect(result.items[0].coverageStatus).toBe("SHORT_BY");
    expect(result.items[0].shortfallAmount).toBe("400.00");
  });
});
