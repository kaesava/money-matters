import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbOrTx } from "@money-matters/db";

const mockPreviewAllocation = vi.fn();
const mockGetActiveStrategy = vi.fn();

vi.mock("./preview-allocation.query.js", () => ({
  previewAllocationQuery: (...args: unknown[]) => mockPreviewAllocation(...args),
}));

vi.mock("./get-active-allocation-strategy.query.js", () => ({
  getActiveAllocationStrategyQuery: (...args: unknown[]) => mockGetActiveStrategy(...args),
}));

import { previewPaydayQuery } from "./preview-payday.query.js";

function createMockDb(targetEvent: Record<string, unknown>) {
  let selectCall = 0;
  return {
    select: vi.fn().mockImplementation(() => {
      selectCall += 1;
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([targetEvent]),
              }),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      };
    }),
  } as unknown as DbOrTx;
}

describe("previewPaydayQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPreviewAllocation.mockResolvedValue({
      lines: [
        {
          bucketId: "env-1",
          bucketName: "Everyday",
          proposedAmount: 1000,
          reasoning: "Test",
        },
      ],
    });
    mockGetActiveStrategy.mockResolvedValue({
      presetKey: "BALANCED",
      name: "Standard Balanced",
    });
  });

  it("falls back to expectedAmount when a PENDING event has actualAmount '0.00'", async () => {
    const db = createMockDb({
      id: "evt-1",
      name: "Salary",
      expectedDate: "2026-11-20",
      expectedAmount: "6000.00",
      actualAmount: "0.00",
      status: "PENDING",
      receivingAccountId: "acc-1",
      bankAccountIsPrivate: false,
      bankAccountUserId: null,
    });

    const result = await previewPaydayQuery("evt-1", "tenant-1", "app-1", db, "user-1");

    expect(result.expectedAmount).toBe(6000);
    expect(result.actualAmount).toBeNull();
    expect(mockPreviewAllocation).toHaveBeenCalledWith(
      "tenant-1",
      "app-1",
      "evt-1",
      6000,
      db,
      undefined,
      "user-1"
    );
  });
});
