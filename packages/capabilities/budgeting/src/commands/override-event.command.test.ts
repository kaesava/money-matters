import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import { overrideEventCommand } from "./override-event.command.js";

describe("overrideEventCommand", () => {
  it("rejects CONFIRMED status for EXPENSE events", async () => {
    const mockDb = { transaction: vi.fn() };
    await expect(
      overrideEventCommand(
        {
          eventId: "ee-1",
          eventType: "EXPENSE",
          updateSeries: false,
          status: "CONFIRMED" as unknown as "PENDING",
        },
        "tenant-1",
        "money-matters",
        "user-1",
        mockDb as unknown as DbOrTx
      )
    ).rejects.toThrow("Expense events cannot be set to CONFIRMED status.");
  });

  it("updates an INCOME event and marks actualAmount when CONFIRMED", async () => {
    const updatedRow = {
      id: "ie-1",
      incomeSourceId: null,
      expectedAmount: "2500.00",
      actualAmount: "2500.00",
      expectedDate: "2026-05-01",
      status: "CONFIRMED",
    };

    const mockTx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedRow]),
          }),
        }),
      }),
    };

    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
    };

    const result = await overrideEventCommand(
      {
        eventId: "ie-1",
        eventType: "INCOME",
        updateSeries: false,
        expectedAmount: "2500.00",
        status: "CONFIRMED",
      },
      "tenant-1",
      "money-matters",
      "user-1",
      mockDb as unknown as DbOrTx
    );

    expect(result).toEqual(updatedRow);
    expect(mockTx.update).toHaveBeenCalledTimes(1);
  });

  it("throws when INCOME event is not found", async () => {
    const mockTx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
    };

    await expect(
      overrideEventCommand(
        {
          eventId: "missing-ie",
          eventType: "INCOME",
          updateSeries: false,
          status: "SKIPPED",
        },
        "tenant-1",
        "money-matters",
        "user-1",
        mockDb as unknown as DbOrTx
      )
    ).rejects.toThrow("Income event not found.");
  });
});
