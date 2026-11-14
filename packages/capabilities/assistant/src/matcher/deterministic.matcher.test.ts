import { describe, it, expect } from "vitest";
import { matchDeterministicIntent } from "./deterministic.matcher.js";

describe("Deterministic Intent Matcher", () => {
  it("matches greetings and help requests at $0 cost", () => {
    expect(matchDeterministicIntent("Hi")?.intent).toBe("GREETING_HELP");
    expect(matchDeterministicIntent("hello!")?.intent).toBe("GREETING_HELP");
    expect(matchDeterministicIntent("what can you do?")?.intent).toBe("GREETING_HELP");
  });

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

  it("matches 'How much is left in Everyday' and custom envelopes to POOL_BALANCE", () => {
    const res1 = matchDeterministicIntent("How much is left in Everyday?");
    expect(res1?.intent).toBe("POOL_BALANCE");
    expect(res1?.params.entityName).toBe("Everyday");

    const res2 = matchDeterministicIntent("How much is left in Groceries?");
    expect(res2?.intent).toBe("POOL_BALANCE");
    expect(res2?.params.entityName).toBe("Groceries");
  });

  it("matches 'Can I afford $250' to CAN_I_AFFORD", () => {
    const res = matchDeterministicIntent("Can I afford $250 next week?");
    expect(res).not.toBeNull();
    expect(res?.intent).toBe("CAN_I_AFFORD");
    expect(res?.params.amount).toBe(250);
  });

  it("matches 'When is my next payday' to NEXT_PAYDAY_ALLOCATION", () => {
    const res = matchDeterministicIntent("When is my next payday?");
    expect(res?.intent).toBe("NEXT_PAYDAY_ALLOCATION");
  });

  it("matches 'Which bills are due this week' to BILLS_DUE", () => {
    const res = matchDeterministicIntent("Which bills are due this week?");
    expect(res?.intent).toBe("BILLS_DUE");
    expect(res?.params.daysAhead).toBe(7);
  });

  it("matches 'i paid an internet bill for $50' to RECORD_BILL_PAYMENT", () => {
    const res = matchDeterministicIntent("i paid an internet bill for $50");
    expect(res?.intent).toBe("RECORD_BILL_PAYMENT");
    expect(res?.params.amount).toBe(50);
    expect(res?.params.entityName?.toLowerCase()).toBe("internet");
  });

  it("matches 'paid $50 for internet' and 'paid internet $50'", () => {
    const res1 = matchDeterministicIntent("paid $50 for internet");
    expect(res1?.intent).toBe("RECORD_BILL_PAYMENT");
    expect(res1?.params.amount).toBe(50);
    expect(res1?.params.entityName?.toLowerCase()).toBe("internet");

    const res2 = matchDeterministicIntent("paid internet $50");
    expect(res2?.intent).toBe("RECORD_BILL_PAYMENT");
    expect(res2?.params.amount).toBe(50);
    expect(res2?.params.entityName?.toLowerCase()).toBe("internet");
  });

  it("matches 'mark internet paid' and 'mark rent as paid'", () => {
    const res1 = matchDeterministicIntent("mark internet paid");
    expect(res1?.intent).toBe("RECORD_BILL_PAYMENT");
    expect(res1?.params.entityName?.toLowerCase()).toBe("internet");

    const res2 = matchDeterministicIntent("mark rent as paid");
    expect(res2?.intent).toBe("RECORD_BILL_PAYMENT");
    expect(res2?.params.entityName?.toLowerCase()).toBe("rent");
  });

  it("matches 'spent $45 at Woolworths' and 'bought groceries for $80'", () => {
    const res1 = matchDeterministicIntent("spent $45 at Woolworths");
    expect(res1?.intent).toBe("RECORD_TRANSACTION");
    expect(res1?.params.amount).toBe(45);
    expect(res1?.params.entityName?.toLowerCase()).toContain("woolworths");

    const res2 = matchDeterministicIntent("bought groceries for $80");
    expect(res2?.intent).toBe("RECORD_TRANSACTION");
    expect(res2?.params.amount).toBe(80);
    expect(res2?.params.entityName?.toLowerCase()).toContain("groceries");
  });

  it("matches 'transfer $100 from savings to everyday'", () => {
    const res = matchDeterministicIntent("transfer $100 from savings to everyday");
    expect(res?.intent).toBe("TRANSFER_FUNDS");
    expect(res?.params.amount).toBe(100);
    expect(res?.params.sourceAccount?.toLowerCase()).toBe("savings");
    expect(res?.params.destinationAccount?.toLowerCase()).toBe("everyday");
  });

  it("matches 'did i pay internet' and 'is rent paid'", () => {
    const res1 = matchDeterministicIntent("did i pay internet?");
    expect(res1?.intent).toBe("BILL_PAYMENT_STATUS");
    expect(res1?.params.entityName?.toLowerCase()).toBe("internet");

    const res2 = matchDeterministicIntent("is rent paid?");
    expect(res2?.intent).toBe("BILL_PAYMENT_STATUS");
    expect(res2?.params.entityName?.toLowerCase()).toBe("rent");
  });

  it("matches 'When can I achieve my Goal?' chip prompt", () => {
    const res = matchDeterministicIntent("When can I achieve my Goal?");
    expect(res?.intent).toBe("GOAL_ACHIEVEMENT_DATE");
    expect(res?.params.entityName).toBeUndefined();
  });

  it("matches create, edit, and canonical navigation actions", () => {
    expect(matchDeterministicIntent("add income")?.intent).toBe("ADD_ENTITY");
    expect(matchDeterministicIntent("add income")?.params.categoryName).toBe("income");
    expect(matchDeterministicIntent("new bill Water for 80")?.intent).toBe("ADD_ENTITY");
    expect(matchDeterministicIntent("new bill Water for 80")?.params.entityName).toBe("Water");
    expect(matchDeterministicIntent("edit bill Internet")?.intent).toBe("EDIT_ENTITY");
    expect(matchDeterministicIntent("settings")?.params.targetScreen).toBe("settings");
    expect(matchDeterministicIntent("view transactions")?.params.targetScreen).toBe("history");
    expect(matchDeterministicIntent("open plan")?.params.targetScreen).toBe("plan");
  });

  it("does not false-positive parse dates or days as amounts", () => {
    const res = matchDeterministicIntent("Which bills are due in 14 days?");
    expect(res?.intent).toBe("BILLS_DUE");
    expect(res?.params.daysAhead).toBe(14);
    expect(res?.params.amount).toBeUndefined();
  });

  it("returns null for complex queries requiring LLM fallback", () => {
    const res = matchDeterministicIntent("Tell me about my financial habits overall");
    expect(res).toBeNull();
  });
});
