import { describe, it, expect } from "vitest";
import { budgetingRouter } from "./budgeting.router.js";
import { bugReportRouter } from "./bug-report.router.js";

describe("Router protections & procedure sanity checks", () => {
  it("exports budgetingRouter with required pool and category procedures", () => {
    expect(budgetingRouter).toBeDefined();
    expect(budgetingRouter.createPool).toBeDefined();
    expect(budgetingRouter.updatePool).toBeDefined();
    expect(budgetingRouter.archivePool).toBeDefined();
    expect(budgetingRouter.listPools).toBeDefined();
    expect(budgetingRouter.moveMoney).toBeDefined();
    expect(budgetingRouter.createCategory).toBeDefined();
    expect(budgetingRouter.updateCategory).toBeDefined();
    expect(budgetingRouter.archiveCategory).toBeDefined();
    expect(budgetingRouter.listCategories).toBeDefined();
  });

  it("exports bugReportRouter with createBugReport procedure", () => {
    expect(bugReportRouter).toBeDefined();
    expect(bugReportRouter.createBugReport).toBeDefined();
  });
});

