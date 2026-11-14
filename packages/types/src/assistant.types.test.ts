import { describe, it, expect } from "vitest";
import {
  AssistantAskInputSchema,
  AssistantClassifiedIntentSchema,
  AssistantLlmResponseSchema,
  AssistantResultSchema,
  AssistantUsageSchema,
} from "./assistant.types";

describe("Assistant Types & Validation", () => {
  it("validates Ask query input length and limits", () => {
    expect(() => AssistantAskInputSchema.parse({ query: "How much is in my Everyday pool?" })).not.toThrow();
    expect(() => AssistantAskInputSchema.parse({ query: "" })).toThrow();
    expect(() => AssistantAskInputSchema.parse({ query: "   " })).toThrow();
    expect(() => AssistantAskInputSchema.parse({ query: "a".repeat(301) })).toThrow();
  });

  it("validates classified intent structure strictly", () => {
    const valid = AssistantClassifiedIntentSchema.parse({
      intent: "POOL_BALANCE",
      confidence: 0.95,
      params: {
        entityName: "Everyday",
      },
    });
    expect(valid.intent).toBe("POOL_BALANCE");
    expect(valid.params.entityName).toBe("Everyday");

    // Rejects extraneous properties
    expect(() =>
      AssistantClassifiedIntentSchema.parse({
        intent: "POOL_BALANCE",
        confidence: 0.95,
        params: {},
        extra: true,
      })
    ).toThrow();
  });

  it("normalizes tolerant LLM responses and rejects empty answer text", () => {
    const llmIntent = AssistantLlmResponseSchema.parse({
      mode: "intent",
      intent: "ADD_ENTITY",
      confidence: 0.88,
      params: { entityName: "Gym", amount: null, extraField: "ignored" },
    });
    expect(llmIntent.mode).toBe("intent");
    if (llmIntent.mode === "intent") {
      expect(llmIntent.params.amount).toBeUndefined();
      expect(llmIntent.params.entityName).toBe("Gym");
    }

    const llmAnswer = AssistantLlmResponseSchema.parse({
      mode: "answer",
      text: "Your total bills budget is $420.",
    });
    expect(llmAnswer.mode).toBe("answer");

    const llmRefuse = AssistantLlmResponseSchema.parse({ mode: "refuse" });
    expect(llmRefuse.mode).toBe("refuse");
  });

  it("validates assistant discriminated union result types", () => {
    const answerResult = AssistantResultSchema.parse({
      type: "answer",
      templateKey: "assistant.answers.poolBalance",
      templateValues: { balance: "$350.00" },
    });
    expect(answerResult.type).toBe("answer");

    const directTextResult = AssistantResultSchema.parse({
      type: "answer",
      text: "You have 2 upcoming bills.",
    });
    expect(directTextResult.type).toBe("answer");

    const prefillResult = AssistantResultSchema.parse({
      type: "prefill",
      target: "edit-envelope",
      params: { entityId: "11111111-1111-1111-1111-111111111111", name: "Internet" },
    });
    expect(prefillResult.type).toBe("prefill");

    const unavailableResult = AssistantResultSchema.parse({
      type: "unavailable",
      reason: "service_error",
    });
    expect(unavailableResult.type).toBe("unavailable");
  });

  it("validates assistant usage payload", () => {
    const usage = AssistantUsageSchema.parse({
      used: 42,
      limit: 150,
      remaining: 108,
      resetsOn: "2026-11-01",
      plan: "free",
      status: "active",
    });
    expect(usage.remaining).toBe(108);
  });
});
