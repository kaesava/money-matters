import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import { DbUsageStore } from "./db-usage-store.js";

describe("DbUsageStore", () => {
  it("computes remaining calls accurately from monthly limit", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ llmCalls: 35 }]),
          }),
        }),
      }),
      insert: vi.fn(),
    };

    const store = new DbUsageStore(mockDb as unknown as DbOrTx);
    const usage = await store.getUsage("tenant-123");

    expect(usage.used).toBe(35);
    expect(usage.limit).toBe(150);
    expect(usage.remaining).toBe(115);
  });

  it("returns full quota when no row exists yet for current month", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn(),
    };

    const store = new DbUsageStore(mockDb as unknown as DbOrTx);
    const usage = await store.getUsage("tenant-456");

    expect(usage.used).toBe(0);
    expect(usage.remaining).toBe(150);
  });
});
