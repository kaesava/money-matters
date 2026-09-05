import { describe, it, expect } from "vitest";
import { budgetingRouter } from "./budgeting.router.js";
import { transfersRouter } from "./transfers.router.js";

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

  it("exports transfersRouter with required transfer procedures", () => {
    expect(transfersRouter).toBeDefined();
    expect(transfersRouter.listTransferEvents).toBeDefined();
    expect(transfersRouter.createTransferSource).toBeDefined();
    expect(transfersRouter.deleteTransferEvent).toBeDefined();
    expect(transfersRouter.skipTransferEvent).toBeDefined();
    expect(transfersRouter.executeTransferEvent).toBeDefined();
  });
});

