import type { createEdgeContext } from "../trpc/edge-context";
import { describe, it, expect } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import { appRouter } from "./_app.js";

function createMockDb(): DbOrTx {
  const chain: Record<string, unknown> = {
    from: () => chain,
    where: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve([]),
    groupBy: () => Promise.resolve([]),
    then: (resolve: (v: unknown[]) => void) => resolve([]),
  };
  return {
    select: () => chain,
    insert: () => ({ values: () => ({ returning: () => Promise.resolve([]), onConflictDoNothing: () => Promise.resolve([]) }) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve([]) }) }),
  } as unknown as DbOrTx;
}

describe("simulation router", () => {
  it("rejects unauthenticated callers with UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller({
      req: new Request("http://localhost/trpc"),
      resHeaders: new Headers(),
      db: createMockDb() as unknown as Awaited<ReturnType<typeof createEdgeContext>>["db"],
      userId: null,
      session: null,
      email: null,
      tenantId: null,
      appId: null,
      correlationId: "corr-1",
    });

    await expect(caller.canAfford({ amount: "50.00", itemName: "Coffee", mode: "ONE_OFF" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
