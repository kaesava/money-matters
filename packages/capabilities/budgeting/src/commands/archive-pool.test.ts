import { describe, it, expect, vi } from "vitest";
import { pools, categories, expenseEvents } from "@money-matters/db";
import { archivePoolCommand } from "./archive-pool.command";

describe("archivePoolCommand", () => {
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const appId = "00000000-0000-0000-0000-000000000002";
  const userId = "00000000-0000-0000-0000-000000000003";

  it("throws error if pool is EVERYDAY pool", async () => {
    const mockDb: any = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockResolvedValue([
            { id: "pool-everyday", poolType: "EVERYDAY", isSurplusTarget: false }
          ])
        }))
      }))
    };

    await expect(archivePoolCommand("pool-everyday", tenantId, appId, userId, mockDb)).rejects.toThrow(
      "The default Everyday pool cannot be deleted or archived."
    );
  });

  it("throws error if pool is Surplus Target pool", async () => {
    const mockDb: any = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockResolvedValue([
            { id: "pool-surplus", poolType: "GOAL", isSurplusTarget: true }
          ])
        }))
      }))
    };

    await expect(archivePoolCommand("pool-surplus", tenantId, appId, userId, mockDb)).rejects.toThrow(
      "Cannot archive the designated Surplus Target pool."
    );
  });

  it("archives pool and cascades soft-archival to child categories", async () => {
    const updateSets: any[] = [];
    const mockDb: any = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: any) => ({
          where: vi.fn().mockResolvedValue(
            table === pools
              ? [{ id: "pool-reg-1", poolType: "REGULAR", isSurplusTarget: false }]
              : [] // no pending expense events
          )
        }))
      })),
      update: vi.fn().mockImplementation((table: any) => ({
        set: vi.fn().mockImplementation((setVal: any) => {
          updateSets.push({ table, setVal });
          return {
            where: vi.fn().mockImplementation(() => ({
              returning: vi.fn().mockResolvedValue(table === pools ? [{ id: "pool-reg-1", archivedAt: new Date() }] : [])
            }))
          };
        })
      }))

    };

    const res = await archivePoolCommand("pool-reg-1", tenantId, appId, userId, mockDb);
    expect(res).toBeDefined();
    expect(updateSets.length).toBe(2);
    expect(updateSets[0].table).toBe(pools);
    expect(updateSets[1].table).toBe(categories);
  });
});
