import { describe, it, expect } from "vitest";
import { appRouter } from "./_app.js";
import type { EdgeContext } from "../trpc/edge-context.js";
import { budgetingRouter } from "./budgeting.router.js";
import { transfersRouter } from "./transfers.router.js";
import { expensesRouter } from "./expenses.router.js";
import { tenantRouter } from "./tenant.router.js";
import { assistantRouterMap } from "./assistant.router.js";

const unauthContext: EdgeContext = {
  req: new Request("http://localhost/trpc"),
  resHeaders: new Headers(),
  userId: null,
  tenantId: null,
  appId: null,
  session: null,
  email: null,
  correlationId: "test-corr-id",
  db: {} as EdgeContext["db"],
};

describe("Router protections & procedure sanity checks", () => {
  it("exports tenantRouter with required downtime/early access subscription procedure", () => {
    expect(tenantRouter).toBeDefined();
    expect(tenantRouter.subscribeEarlyAccess).toBeDefined();
    expect(tenantRouter.getTenantStatus).toBeDefined();
  });

  it("exports budgetingRouter with required envelope procedures", () => {
    expect(budgetingRouter).toBeDefined();
    expect(budgetingRouter.createEnvelope).toBeDefined();
    expect(budgetingRouter.updateEnvelope).toBeDefined();
    expect(budgetingRouter.archiveEnvelope).toBeDefined();
    expect(budgetingRouter.listEnvelopes).toBeDefined();
    expect(budgetingRouter.moveMoney).toBeDefined();
    expect(budgetingRouter.burstUpcomingEvents).toBeDefined();
  });

  it("exports transfersRouter with required transfer procedures", () => {
    expect(transfersRouter).toBeDefined();
    expect(transfersRouter.listTransferEvents).toBeDefined();
    expect(transfersRouter.createTransferSource).toBeDefined();
    expect(transfersRouter.deleteTransferEvent).toBeDefined();
    expect(transfersRouter.executeTransferEvent).toBeDefined();
  });

  it("exports assistantRouterMap with assistantAsk and assistantUsage", () => {
    expect(assistantRouterMap).toBeDefined();
    expect(assistantRouterMap.assistantAsk).toBeDefined();
    expect(assistantRouterMap.assistantUsage).toBeDefined();
  });

  it("exports expensesRouter with listBillSchedules", () => {
    expect(expensesRouter).toBeDefined();
    expect(expensesRouter.listBillSchedules).toBeDefined();
  });

  it("rejects unauthenticated callers across all protected router domains", async () => {
    const caller = appRouter.createCaller(unauthContext);

    await expect(caller.listEnvelopes()).rejects.toThrow();
    await expect(caller.listIncomeSources()).rejects.toThrow();
    await expect(caller.exportMyData()).rejects.toThrow();
    await expect(caller.getUserPreferences()).rejects.toThrow();
    await expect(caller.listTransferEvents()).rejects.toThrow();
    await expect(caller.assistantUsage()).rejects.toThrow();
    await expect(
      caller.fileNotes.list({ entityType: "ENVELOPE", entityId: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toThrow();
    await expect(
      caller.submitFeedback({
        category: "BUG",
        severity: "LOW",
        title: "Test",
        description: "Test description",
        appVersion: "1.0.0",
      })
    ).rejects.toThrow();
  });
});
