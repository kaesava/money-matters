import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import { deleteUpcomingEventCommand } from "./delete-upcoming-event.command.js";

describe("deleteUpcomingEventCommand", () => {
  it("deletes upcoming income event using tenant isolation", async () => {
    const mockTx = {
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "event-1" }]),
    };
    const mockDb = {
      transaction: vi.fn().mockImplementation((cb) => cb(mockTx)),
    } as unknown as DbOrTx;

    const res = await deleteUpcomingEventCommand(
      { eventId: "11111111-1111-4111-8111-111111111111", eventType: "INCOME" },
      "tenant-1",
      "app-1",
      "user-1",
      mockDb
    );

    expect(res).toEqual({ success: true, id: "event-1" });
    expect(mockTx.delete).toHaveBeenCalled();
  });

  it("deletes upcoming expense event using tenant isolation", async () => {
    const mockTx = {
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "event-2" }]),
    };
    const mockDb = {
      transaction: vi.fn().mockImplementation((cb) => cb(mockTx)),
    } as unknown as DbOrTx;

    const res = await deleteUpcomingEventCommand(
      { eventId: "22222222-2222-4222-8222-222222222222", eventType: "EXPENSE" },
      "tenant-1",
      "app-1",
      "user-1",
      mockDb
    );

    expect(res).toEqual({ success: true, id: "event-2" });
    expect(mockTx.delete).toHaveBeenCalled();
  });
});
