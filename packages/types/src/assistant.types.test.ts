import { describe, it, expect } from "vitest";
import {
  AssistantAskInputSchema,
  AssistantClassifiedIntentSchema,
  AssistantResultSchema,
  AssistantUsageSchema,
} from "./assistant.types";

describe("Assistant Types & Validation", () => {
  it("validates Ask query input length and limits", () => {
    expect(() => AssistantAskInputSchema.parse({ query: "How much is in my Everyday pool?" })).not.toThrow();
    expect(() => AssistantAskInputSchema.parse({ query: "" })).toThrow();
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

  it("validates assistant discriminated union result types", () => {
    const answerResult = AssistantResultSchema.parse({
      type: "answer",
      templateKey: "assistant.answers.poolBalance",
      templateValues: { balance: 350 },
    });
    expect(answerResult.type).toBe("answer");

    const prefillResult = AssistantResultSchema.parse({
      type: "prefill",
      target: "mark-paid",
      params: { billName: "Internet", amount: 190 },
    });
    expect(prefillResult.type).toBe("prefill");

    const unavailableResult = AssistantResultSchema.parse({
      type: "unavailable",
      reason: "quota_exceeded",
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
