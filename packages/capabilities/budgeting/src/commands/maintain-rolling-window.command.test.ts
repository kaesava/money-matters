import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import { maintainRollingWindowCommand } from "./maintain-rolling-window.command.js";
import * as incomeSchedule from "./income-schedule.js";
import * as envelopeSchedule from "./envelope-schedule.js";

vi.mock("./income-schedule.js", () => ({
  burstIncomeEvents: vi.fn(),
}));

vi.mock("./envelope-schedule.js", () => ({
  burstEnvelopeEvents: vi.fn(),
}));

describe("maintainRollingWindowCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bursts active income and bill schedules and skips zero-amount bills", async () => {
    vi.mocked(incomeSchedule.burstIncomeEvents).mockResolvedValue(3);
    vi.mocked(envelopeSchedule.burstEnvelopeEvents).mockResolvedValue(4);

    const selectResults = [
      [{ timezone: "Australia/Sydney" }],
      [
        {
          id: "inc-1",
          name: "Salary",
          amount: "3000.00",
          rrule: "FREQ=WEEKLY;INTERVAL=2",
          startDate: "2026-01-01",
          endDate: null,
          contributionMode: "FULL",
          contributionValue: null,
          lastBurstDate: null,
        },
      ],
      [
        {
          id: "env-bill-1",
          name: "Rent",
          enteredAmount: "1500.00",
          monthlyAmount: "3000.00",
          rrule: "FREQ=MONTHLY",
          startDate: "2026-01-01",
          endDate: null,
          lastBurstDate: null,
        },
        {
          id: "env-bill-zero",
          name: "Zero Bill",
          enteredAmount: "0.00",
          monthlyAmount: "0.00",
          rrule: "FREQ=MONTHLY",
          startDate: "2026-01-01",
          endDate: null,
          lastBurstDate: null,
        },
      ],
    ];

    let callIdx = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        const rows = selectResults[callIdx++] ?? [];
        const thenable = Promise.resolve(rows) as Promise<unknown[]> & {
          from: ReturnType<typeof vi.fn>;
          where: ReturnType<typeof vi.fn>;
          limit: ReturnType<typeof vi.fn>;
        };
        thenable.from = vi.fn().mockReturnValue(thenable);
        thenable.where = vi.fn().mockReturnValue(thenable);
        thenable.limit = vi.fn().mockResolvedValue(rows);
        return thenable;
      }),
    };

    const result = await maintainRollingWindowCommand({
      db: mockDb as unknown as DbOrTx,
      tenantId: "tenant-1",
      appId: "money-matters",
      userId: "user-1",
    });

    expect(result).toEqual({
      success: true,
      incomeEventsCreated: 3,
      expenseEventsCreated: 4,
      newEventsCount: 7,
    });
    expect(incomeSchedule.burstIncomeEvents).toHaveBeenCalledTimes(1);
    expect(envelopeSchedule.burstEnvelopeEvents).toHaveBeenCalledTimes(1);
  });
});
