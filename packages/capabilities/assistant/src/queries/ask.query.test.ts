import { describe, it, expect, vi, beforeEach } from "vitest";
import { askAssistant } from "./ask.query.js";
import type { IntentHandlerPort, LlmProviderPort, UsageStorePort, IntentContext } from "../ports/index.js";

describe("Ask Assistant Query Orchestration", () => {
  const context: IntentContext = {
    tenantId: "11111111-1111-1111-1111-111111111111",
    userId: "22222222-2222-2222-2222-222222222222",
  };
  const appId = "01908bde-34bb-7b19-a178-574211bc93aa";

  let mockHandler: IntentHandlerPort;
  let mockLlm: LlmProviderPort;
  let mockStore: UsageStorePort;

  beforeEach(() => {
    mockHandler = {
      handleGoalDate: vi.fn().mockResolvedValue({ type: "answer", templateKey: "assistant.answers.goal" }),
      handlePoolBalance: vi.fn().mockResolvedValue({ type: "answer", templateKey: "assistant.answers.pool" }),
      handleNextPayday: vi.fn().mockResolvedValue({ type: "answer", templateKey: "assistant.answers.payday" }),
      handleBillsDue: vi.fn().mockResolvedValue({ type: "answer", templateKey: "assistant.answers.bills" }),
      handleBillCoverage: vi.fn().mockResolvedValue({ type: "answer", templateKey: "assistant.answers.coverage" }),
      handleSpendingSummary: vi.fn().mockResolvedValue({ type: "answer", templateKey: "assistant.answers.spending" }),
    };

    mockLlm = {
      classifyIntent: vi.fn().mockResolvedValue({
        intent: "RECORD_BILL_PAYMENT",
        confidence: 0.9,
        params: { entityName: "Gym", amount: 50 },
      }),
    };

    mockStore = {
      getUsage: vi.fn().mockResolvedValue({ used: 10, limit: 150, remaining: 140, resetsOn: "2026-11-01" }),
      incrementLlmCalls: vi.fn().mockResolvedValue(true),
    };
  });

  it("resolves deterministic questions without calling LLM or incrementing quota", async () => {
    const res = await askAssistant({
      query: "When is my next payday?",
      context,
      appId,
      handler: mockHandler,
      llmProvider: mockLlm,
      usageStore: mockStore,
    });

    expect(res.type).toBe("answer");
    expect(mockHandler.handleNextPayday).toHaveBeenCalled();
    expect(mockLlm.classifyIntent).not.toHaveBeenCalled();
    expect(mockStore.incrementLlmCalls).not.toHaveBeenCalled();
  });

  it("blocks LLM and returns quota_exceeded when monthly limit is reached", async () => {
    mockStore.getUsage = vi.fn().mockResolvedValue({ used: 150, limit: 150, remaining: 0, resetsOn: "2026-11-01" });

    const res = await askAssistant({
      query: "Random question requiring AI classification",
      context,
      appId,
      handler: mockHandler,
      llmProvider: mockLlm,
      usageStore: mockStore,
    });

    expect(res.type).toBe("unavailable");
    if (res.type === "unavailable") {
      expect(res.reason).toBe("quota_exceeded");
    }
    expect(mockLlm.classifyIntent).not.toHaveBeenCalled();
  });

  it("blocks LLM fallback in read-only grace period", async () => {
    const res = await askAssistant({
      query: "Uncertain query requiring LLM",
      context,
      appId,
      isGracePeriod: true,
      handler: mockHandler,
      llmProvider: mockLlm,
      usageStore: mockStore,
    });

    expect(res.type).toBe("unavailable");
    if (res.type === "unavailable") {
      expect(res.reason).toBe("read_only_grace");
    }
  });

  it("allows deterministic queries even during read-only grace period", async () => {
    const res = await askAssistant({
      query: "How much is left in Everyday?",
      context,
      appId,
      isGracePeriod: true,
      handler: mockHandler,
      llmProvider: mockLlm,
      usageStore: mockStore,
    });

    expect(res.type).toBe("answer");
    expect(mockHandler.handlePoolBalance).toHaveBeenCalled();
  });
});
