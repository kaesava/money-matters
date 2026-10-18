import { describe, it, expect } from "vitest";
import { matchDeterministicIntent } from "./deterministic.matcher.js";

describe("Deterministic Intent Matcher", () => {
  it("matches 'I paid my internet bill $190 on 23-Jan' to RECORD_BILL_PAYMENT", () => {
    const res = matchDeterministicIntent("I paid my internet bill $190 on 23-Jan");
    expect(res).not.toBeNull();
    expect(res?.intent).toBe("RECORD_BILL_PAYMENT");
    expect(res?.params.amount).toBe(190);
    expect(res?.params.entityName?.toLowerCase()).toContain("internet");
    expect(res?.params.date).toBe("2026-01-23");
  });

  it("matches 'When can I achieve Goal Emergency Fund' to GOAL_ACHIEVEMENT_DATE", () => {
    const res = matchDeterministicIntent("When can I achieve Goal Emergency Fund?");
    expect(res).not.toBeNull();
    expect(res?.intent).toBe("GOAL_ACHIEVEMENT_DATE");
    expect(res?.params.entityName?.toLowerCase()).toContain("emergency fund");
  });

  it("matches 'How much is left in Everyday' to POOL_BALANCE", () => {
    const res = matchDeterministicIntent("How much is left in Everyday?");
    expect(res).not.toBeNull();
    expect(res?.intent).toBe("POOL_BALANCE");
    expect(res?.params.entityName).toBe("Everyday");
  });

  it("matches 'Can I afford $250' to CAN_I_AFFORD", () => {
    const res = matchDeterministicIntent("Can I afford $250 next week?");
    expect(res).not.toBeNull();
    expect(res?.intent).toBe("CAN_I_AFFORD");
    expect(res?.params.amount).toBe(250);
  });

  it("matches 'When is my next payday' to NEXT_PAYDAY_ALLOCATION", () => {
    const res = matchDeterministicIntent("When is my next payday?");
    expect(res).not.toBeNull();
    expect(res?.intent).toBe("NEXT_PAYDAY_ALLOCATION");
  });

  it("matches 'Which bills are due this week' to BILLS_DUE", () => {
    const res = matchDeterministicIntent("Which bills are due this week?");
    expect(res).not.toBeNull();
    expect(res?.intent).toBe("BILLS_DUE");
    expect(res?.params.daysAhead).toBe(7);
  });

  it("returns null for ambiguous queries requiring LLM fallback", () => {
    const res = matchDeterministicIntent("Tell me about my financial habits overall");
    expect(res).toBeNull();
  });
});
