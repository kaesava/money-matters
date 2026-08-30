import { describe, it, expect } from "vitest";
import { categoriesRouter } from "./categories.router.js";
import { poolsRouter } from "./pools.router.js";
import { bugReportRouter } from "./bug-report.router.js";

describe("Router protections & procedure sanity checks", () => {
  it("exports categoriesRouter with required procedures", () => {
    expect(categoriesRouter).toBeDefined();
    expect(categoriesRouter.createCategory).toBeDefined();
    expect(categoriesRouter.updateCategory).toBeDefined();
    expect(categoriesRouter.archiveCategory).toBeDefined();
    expect(categoriesRouter.moveMoney).toBeDefined();
    expect(categoriesRouter.listCategories).toBeDefined();
  });

  it("exports poolsRouter with required procedures", () => {
    expect(poolsRouter).toBeDefined();
    expect(poolsRouter.createPool).toBeDefined();
    expect(poolsRouter.updatePool).toBeDefined();
    expect(poolsRouter.archivePool).toBeDefined();
    expect(poolsRouter.listPools).toBeDefined();
  });

  it("exports bugReportRouter with createBugReport procedure", () => {
    expect(bugReportRouter).toBeDefined();
    expect(bugReportRouter.createBugReport).toBeDefined();
  });
});
