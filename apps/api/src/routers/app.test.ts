import { describe, it, expect } from "vitest";
import { appRouter } from "./_app.js";

describe("tRPC App Router procedure definitions", () => {
  it("defines all V2 3-bucket procedures cleanly", () => {
    const caller = appRouter._def.procedures;

    expect(caller).toHaveProperty("createCategory");
    expect(caller).toHaveProperty("updateCategory");
    expect(caller).toHaveProperty("archiveCategory");
    expect(caller).toHaveProperty("listCategories");
    expect(caller).toHaveProperty("getMonthlySummary");
    expect(caller).toHaveProperty("listArchivedItems");
    expect(caller).toHaveProperty("restoreItem");
    expect(caller).toHaveProperty("runAllocation");
    expect(caller).toHaveProperty("canAfford");
    expect(caller).toHaveProperty("recordExpense");
  });

  it("ensures deprecated procedures are culled", () => {
    const caller = appRouter._def.procedures;

    expect(caller).not.toHaveProperty("executeCascade");
    expect(caller).not.toHaveProperty("confirmPlan");
    expect(caller).not.toHaveProperty("resolveShortfall");
    expect(caller).not.toHaveProperty("submitReconciliation");
  });
});
