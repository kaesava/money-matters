import { describe, it, expect, vi } from "vitest";
import { categories, expenseEvents } from "@money-matters/db";
import { archiveCategoryCommand } from "./archive-category.command";

describe("archiveCategoryCommand", () => {
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const appId = "00000000-0000-0000-0000-000000000002";
  const userId = "00000000-0000-0000-0000-000000000003";

  it("throws error if category is the last active category in pool", async () => {
    const mockDb: any = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: any) => ({
          where: vi.fn().mockImplementation(() => {
            if (table === categories) {
              // Return target cat first time, active cats second time (only 1 cat left)
              return Promise.resolve([{ id: "cat-1", poolId: "pool-1" }]);
            }
            return Promise.resolve([]);
          })
        }))
      }))
    };

    await expect(archiveCategoryCommand("cat-1", tenantId, appId, userId, mockDb)).rejects.toThrow(
      "Cannot archive the last active category in a pool. Archive the pool instead."
    );
  });

  it("archives category when pool has multiple active categories", async () => {
    let callCount = 0;
    const mockDb: any = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: any) => ({
          where: vi.fn().mockImplementation(() => {
            if (table === categories) {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: "cat-1", poolId: "pool-1" }]);
              return Promise.resolve([{ id: "cat-1" }, { id: "cat-2" }]); // 2 active categories
            }
            return Promise.resolve([]); // no pending events
          })
        }))
      })),
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "cat-1", archivedAt: new Date() }])
          })
        })
      }))
    };

    const res = await archiveCategoryCommand("cat-1", tenantId, appId, userId, mockDb);
    expect(res).toBeDefined();
    expect(res.id).toBe("cat-1");
  });
});
