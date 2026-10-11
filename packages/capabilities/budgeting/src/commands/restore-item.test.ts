import { describe, it, expect, vi } from "vitest";
import { restoreItemCommand } from "./restore-item.command";
import type { DbOrTx } from "@money-matters/db";

describe("restoreItemCommand", () => {
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const appId = "00000000-0000-0000-0000-000000000002";
  const userId = "00000000-0000-0000-0000-000000000003";
  const otherUserId = "00000000-0000-0000-0000-000000000004";

  it("denies restoring a private bank account owned by another user", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: "acc-1", isPrivate: true, userId: otherUserId },
          ]),
        }),
      }),
    } as unknown as DbOrTx;

    await expect(
      restoreItemCommand("acc-1", "BANK_ACCOUNT", tenantId, appId, userId, mockDb)
    ).rejects.toThrow("Access unauthorized or private account.");
  });

  it("restores an envelope successfully", async () => {
    const updatedTables: unknown[] = [];
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { isPrivate: false, bankAccountUserId: null },
            ]),
          }),
        }),
      }),
      update: vi.fn().mockImplementation((table: unknown) => {
        updatedTables.push(table);
        return {
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                { id: "env-1", name: "Groceries Envelope" },
              ]),
            }),
          }),
        };
      }),
    } as unknown as DbOrTx;

    const res = await restoreItemCommand("env-1", "ENVELOPE", tenantId, appId, userId, mockDb);
    expect(res).toBeDefined();
    expect(updatedTables.length).toBe(1);
  });
});
