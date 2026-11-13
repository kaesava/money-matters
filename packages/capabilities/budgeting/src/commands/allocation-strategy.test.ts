import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import { updateAllocationStrategyStepsCommand } from "./update-allocation-strategy-steps.command.js";
import { applyAllocationPresetCommand } from "./apply-allocation-preset.command.js";

describe("allocation strategy commands", () => {
  it("updateAllocationStrategyStepsCommand pins SURPLUS_SWEEP as the final step", async () => {
    let insertedRows: Array<{ stepType: string; orderIndex: number }> = [];

    const mockTx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 1 }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((rows: Array<{ stepType: string; orderIndex: number }>) => {
          insertedRows = rows;
          return {
            returning: vi.fn().mockResolvedValue(rows),
          };
        }),
      }),
    };

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "strat-1", tenantId: "tenant-1", appId: "app-1" }]),
          }),
        }),
      }),
      transaction: vi.fn().mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
    };

    const res = await updateAllocationStrategyStepsCommand(
      "tenant-1",
      "app-1",
      "user-1",
      "strat-1",
      [
        { orderIndex: 0, stepType: "SURPLUS_SWEEP", targetEnvelopeId: "env-sweep" },
        { orderIndex: 1, stepType: "IMMEDIATE_BILLS" },
        { orderIndex: 2, stepType: "EVERYDAY_ALLOWANCE" },
      ],
      mockDb as unknown as DbOrTx
    );

    expect(res.presetKey).toBe("CUSTOM");
    expect(insertedRows.map((r) => [r.stepType, r.orderIndex])).toEqual([
      ["IMMEDIATE_BILLS", 0],
      ["EVERYDAY_ALLOWANCE", 1],
      ["SURPLUS_SWEEP", 2],
    ]);
  });

  it("applyAllocationPresetCommand updates preset and inserts canonical steps", async () => {
    let insertedRows: Array<{ stepType: string; orderIndex: number }> = [];

    const mockTx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "strat-1", presetKey: "BILLS_FORTRESS" }]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((rows: Array<{ stepType: string; orderIndex: number }>) => {
          insertedRows = rows;
          return {
            returning: vi.fn().mockResolvedValue(rows),
          };
        }),
      }),
    };

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "strat-1", tenantId: "tenant-1", appId: "app-1" }]),
          }),
        }),
      }),
      transaction: vi.fn().mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
    };

    const res = await applyAllocationPresetCommand(
      "tenant-1",
      "app-1",
      "user-1",
      "BILLS_FORTRESS",
      mockDb as unknown as DbOrTx,
      false
    );

    expect(res.presetKey).toBe("BILLS_FORTRESS");
    expect(insertedRows[insertedRows.length - 1]?.stepType).toBe("SURPLUS_SWEEP");
  });
});
