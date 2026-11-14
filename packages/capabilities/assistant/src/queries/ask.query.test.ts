import { describe, it, expect, vi, beforeEach } from "vitest";
import { askAssistant } from "./ask.query.js";
import type { IntentHandlerPort, LlmProviderPort, UsageStorePort, IntentContext } from "../ports/index.js";

describe("Ask Assistant Query Orchestration", () => {
  const context: IntentContext = {
    tenantId: "11111111-1111-1111-1111-111111111111",
    userId: "22222222-2222-2222-2222-222222222222",
    currency: "USD",
    timezone: "UTC",
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
      buildSafeContext: vi.fn().mockResolvedValue({
        currency: "USD",
        timezone: "UTC",
        todayIso: "2026-11-14",
        everydaySafeToSpend: "450.00",
        envelopes: [],
        upcomingBills: [],
        upcomingIncome: [],
      }),
      resolveEditTarget: vi.fn().mockResolvedValue({
        type: "prefill",
        target: "edit-bill",
        params: { entityId: "bill-1", name: "Internet" },
      }),
    };

    mockLlm = {
      classifyIntent: vi.fn().mockResolvedValue({
        ok: true,
        response: {
          mode: "intent",
          intent: "RECORD_BILL_PAYMENT",
          confidence: 0.9,
          params: { entityName: "Gym", amount: 50 },
        },
      }),
    };

    mockStore = {
      getUsage: vi.fn().mockResolvedValue({ used: 10, limit: 150, remaining: 140, resetsOn: "2026-11-01" }),
      incrementLlmCalls: vi.fn().mockResolvedValue(true),
      decrementLlmCalls: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("answers greetings deterministically at $0 cost", async () => {
    const res = await askAssistant({
      query: "Hi",
      context,
      appId,
      handler: mockHandler,
      llmProvider: mockLlm,
      usageStore: mockStore,
    });

    expect(res).toEqual({ type: "answer", templateKey: "assistant.answers.greetingHelp" });
    expect(mockLlm.classifyIntent).not.toHaveBeenCalled();
    expect(mockStore.incrementLlmCalls).not.toHaveBeenCalled();
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

    expect(res).toEqual({ type: "unavailable", reason: "quota_exceeded" });
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

    expect(res).toEqual({ type: "unavailable", reason: "read_only_grace" });
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

  it("refunds quota and returns service_error when LLM gateway fails", async () => {
    mockLlm.classifyIntent = vi.fn().mockResolvedValue({ ok: false, reason: "gateway_error" });
    const res = await askAssistant({
      query: "How are my bills looking across the month?",
      context,
      appId,
      handler: mockHandler,
      llmProvider: mockLlm,
      usageStore: mockStore,
    });

    expect(res).toEqual({ type: "unavailable", reason: "service_error" });
    expect(mockStore.incrementLlmCalls).toHaveBeenCalledTimes(1);
    expect(mockStore.decrementLlmCalls).toHaveBeenCalledTimes(1);
  });

  it("charges quota and returns outOfScope when LLM refuses off-topic query", async () => {
    mockLlm.classifyIntent = vi.fn().mockResolvedValue({ ok: true, response: { mode: "refuse" } });
    const res = await askAssistant({
      query: "Write me a poem about dolphins",
      context,
      appId,
      handler: mockHandler,
      llmProvider: mockLlm,
      usageStore: mockStore,
    });

    expect(res).toEqual({ type: "answer", templateKey: "assistant.answers.outOfScope" });
    expect(mockStore.incrementLlmCalls).toHaveBeenCalledTimes(1);
    expect(mockStore.decrementLlmCalls).not.toHaveBeenCalled();
  });

  it("sanitizes bounded LLM snapshot answers", async () => {
    mockLlm.classifyIntent = vi.fn().mockResolvedValue({
      ok: true,
      response: { mode: "answer", text: "You have <b>2</b> bills. See [link](https://evil.test)." },
    });
    const res = await askAssistant({
      query: "How do my envelopes compare with my monthly plan?",
      context,
      appId,
      handler: mockHandler,
      llmProvider: mockLlm,
      usageStore: mockStore,
    });

    expect(res).toEqual({ type: "answer", text: "You have 2 bills. See link." });
  });

  it("handles ADD_ENTITY and EDIT_ENTITY intents via prefills", async () => {
    mockLlm.classifyIntent = vi.fn().mockResolvedValue({
      ok: true,
      response: {
        mode: "intent",
        intent: "ADD_ENTITY",
        confidence: 0.9,
        params: { categoryName: "bill", entityName: "Water", amount: 80 },
      },
    });
    const addRes = await askAssistant({
      query: "Please help set up water",
      context,
      appId,
      handler: mockHandler,
      llmProvider: mockLlm,
      usageStore: mockStore,
    });

    expect(addRes.type).toBe("prefill");
    if (addRes.type === "prefill") {
      expect(addRes.target).toBe("create-bill");
      expect(addRes.params.name).toBe("Water");
    }

    const editRes = await askAssistant({
      query: "edit bill Internet",
      context,
      appId,
      handler: mockHandler,
      llmProvider: mockLlm,
      usageStore: mockStore,
    });
    expect(editRes).toEqual({
      type: "prefill",
      target: "edit-bill",
      params: { entityId: "bill-1", name: "Internet" },
    });
  });
});
