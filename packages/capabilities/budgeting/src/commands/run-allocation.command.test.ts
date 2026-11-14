import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import * as dbModule from "@money-matters/db";
import { parseRruleFrequencyDays, runAllocationCommand } from "./run-allocation.command.js";

vi.mock("@money-matters/db", async (importOriginal) => {
  const actual = await importOriginal<typeof dbModule>();
  return {
    ...actual,
    getEnvelopeBalancesMap: vi.fn(),
  };
});

describe("parseRruleFrequencyDays", () => {
  it("parses weekly, fortnightly, monthly, yearly, and default intervals", () => {
    expect(parseRruleFrequencyDays(null)).toBe(14);
    expect(parseRruleFrequencyDays("FREQ=WEEKLY;INTERVAL=1")).toBe(7);
    expect(parseRruleFrequencyDays("FREQ=WEEKLY;INTERVAL=2")).toBe(14);
    expect(parseRruleFrequencyDays("FREQ=MONTHLY")).toBe(30);
    expect(parseRruleFrequencyDays("FREQ=YEARLY")).toBe(365);
  });
});

describe("runAllocationCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when the income event belongs to a partner private bank account", async () => {
    vi.mocked(dbModule.getEnvelopeBalancesMap).mockResolvedValue({});

    const selectResults = [
      [], // envelopes
      [
        {
          id: "ie-partner",
          expectedDate: "2026-05-01",
          rrule: "FREQ=WEEKLY;INTERVAL=2",
          incomeType: "SALARY",
          contributionMode: "FULL",
          contributionValue: null,
          bankAccountUserId: "user-2",
          bankAccountIsPrivate: true,
        },
      ],
    ];

    let callIdx = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        const rows = selectResults[callIdx++] ?? [];
        const thenable = Promise.resolve(rows) as Promise<unknown[]> & {
          from: ReturnType<typeof vi.fn>;
          leftJoin: ReturnType<typeof vi.fn>;
          where: ReturnType<typeof vi.fn>;
        };
        thenable.from = vi.fn().mockReturnValue(thenable);
        thenable.leftJoin = vi.fn().mockReturnValue(thenable);
        thenable.where = vi.fn().mockReturnValue(thenable);
        return thenable;
      }),
    };

    await expect(
      runAllocationCommand(
        "tenant-1",
        "money-matters",
        "user-1",
        "ie-partner",
        2000,
        mockDb as unknown as DbOrTx
      )
    ).rejects.toThrow("Income event not found.");
  });
});
