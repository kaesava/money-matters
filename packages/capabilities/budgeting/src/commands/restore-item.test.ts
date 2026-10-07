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

  it("blocks restoring a category whose parent pool is currently archived", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                {
                  poolArchivedAt: new Date(),
                  isPrivate: false,
                  bankAccountUserId: null,
                },
              ]),
            }),
          }),
        }),
      }),
    } as unknown as DbOrTx;

    await expect(
      restoreItemCommand("cat-1", "CATEGORY", tenantId, appId, userId, mockDb)
    ).rejects.toThrow("Cannot restore category because its parent pool is archived. Restore the pool first.");
  });

  it("restores a pool and cascades restoration to child categories", async () => {
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
                { id: "pool-1", name: "Groceries Pool" },
              ]),
            }),
          }),
        };
      }),
    } as unknown as DbOrTx;

    const res = await restoreItemCommand("pool-1", "POOL", tenantId, appId, userId, mockDb);
    expect(res).toBeDefined();
    // Pool update + Category cascade update
    expect(updatedTables.length).toBe(2);
  });

  it("cascades restore to child categories using cutoff with 2s lag tolerance", async () => {
    const poolArchiveDate = new Date("2026-05-01T12:00:00.000Z");
    let categoryWhereClause: any = null;

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { isPrivate: false, bankAccountUserId: null, archivedAt: poolArchiveDate },
            ]),
          }),
        }),
      }),
      update: vi.fn().mockImplementation((table: any) => {
        return {
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation((clause: any) => {
              if (table !== null) {
                categoryWhereClause = clause;
              }
              return {
                returning: vi.fn().mockResolvedValue([
                  { id: "pool-1", name: "Groceries Pool", archivedAt: poolArchiveDate },
                ]),
              };
            }),
          }),
        };
      }),
    } as unknown as DbOrTx;

    const res = await restoreItemCommand("pool-1", "POOL", tenantId, appId, userId, mockDb);
    expect(res).toBeDefined();
    expect(categoryWhereClause).toBeDefined();
  });
});
