import { describe, it, expect, vi } from "vitest";
import { restoreItemCommand } from "./restore-item.command";
import type { DbOrTx } from "@money-matters/db";

describe("restoreItemCommand", () => {
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const appId = "00000000-0000-0000-0000-000000000002";
  const userId = "00000000-0000-0000-0000-000000000003";
  const otherUserId = "00000000-0000-0000-0000-000000000004";

  it("denies restoring a private bank account owned by another user", async () => {
    const chainable = (data: unknown) => {
      const p = Promise.resolve(data);
      const chain: Record<string, unknown> = {
        limit: vi.fn().mockReturnValue(p),
        then: (cb: (v: unknown) => unknown) => p.then(cb),
        catch: (cb: (e: unknown) => unknown) => p.catch(cb),
      };
      return chain;
    };

    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDb)),
      select: vi.fn().mockImplementation((fields?: unknown) => ({
        from: vi.fn().mockImplementation((table: unknown) => ({
          where: vi.fn().mockImplementation(() => {
            if ((fields as Record<string, unknown> | undefined)?.timezone) {
              return chainable([{ timezone: "Australia/Sydney" }]);
            }
            return chainable([{ id: "acc-1", isPrivate: true, userId: otherUserId }]);
          }),
        })),
      })),
    } as unknown as DbOrTx;

    await expect(
      restoreItemCommand("acc-1", "BANK_ACCOUNT", tenantId, appId, userId, mockDb)
    ).rejects.toThrow("Access unauthorized or private account.");
  });

  it("restores an envelope successfully", async () => {
    const updatedTables: unknown[] = [];
    const chainable = (data: unknown) => {
      const p = Promise.resolve(data);
      const chain: Record<string, unknown> = {
        limit: vi.fn().mockReturnValue(p),
        then: (cb: (v: unknown) => unknown) => p.then(cb),
        catch: (cb: (e: unknown) => unknown) => p.catch(cb),
      };
      return chain;
    };

    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDb)),
      select: vi.fn().mockImplementation((fields?: unknown) => ({
        from: vi.fn().mockImplementation((table: unknown) => ({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue(chainable([
              { isPrivate: false, bankAccountUserId: null, archivedAt: new Date() },
            ])),
          }),
          where: vi.fn().mockImplementation(() => {
            if ((fields as Record<string, unknown> | undefined)?.timezone) {
              return chainable([{ timezone: "Australia/Sydney" }]);
            }
            return chainable([{ isPrivate: false, bankAccountUserId: null, archivedAt: new Date() }]);
          }),
        })),
      })),
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

  it("rejects restoring an already-active envelope (archivedAt IS NOT NULL guard)", async () => {
    const chainable = (data: unknown) => {
      const p = Promise.resolve(data);
      const chain: Record<string, unknown> = {
        limit: vi.fn().mockReturnValue(p),
        then: (cb: (v: unknown) => unknown) => p.then(cb),
        catch: (cb: (e: unknown) => unknown) => p.catch(cb),
      };
      return chain;
    };

    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDb)),
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue(chainable([])),
          }),
          where: vi.fn().mockReturnValue(chainable([])),
        })),
      })),
    } as unknown as DbOrTx;

    await expect(
      restoreItemCommand("env-active", "ENVELOPE", tenantId, appId, userId, mockDb)
    ).rejects.toThrow("Envelope not found");
  });
});
