import { describe, it, expect, vi } from "vitest";
import { resetAllocationPlanCommand } from "./reset-allocation-plan.command.js";

describe("resetAllocationPlanCommand", () => {
  it("deletes PENDING allocation plan and lines if found", async () => {
    const mockPlan = { id: "plan-123" };
    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockPlan]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      }),
    };

    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx)),
    };

    const res = await resetAllocationPlanCommand(
      "event-123",
      "tenant-1",
      "app-1",
      mockDb as any
    );

    expect(res).toEqual({ success: true, count: 1, planId: "plan-123" });
    expect(mockTx.delete).toHaveBeenCalledTimes(2);
  });

  it("returns count 0 if no PENDING plan exists", async () => {
    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      delete: vi.fn(),
    };

    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx)),
    };

    const res = await resetAllocationPlanCommand(
      "event-123",
      "tenant-1",
      "app-1",
      mockDb as any
    );

    expect(res).toEqual({ success: true, count: 0 });
    expect(mockTx.delete).not.toHaveBeenCalled();
  });
});
