import { describe, it, expect } from "vitest";
import { sanitizeDecimalInput, computePaydayAllocationSummary } from "./payday-draft-math.js";

describe("sanitizeDecimalInput", () => {
  it("strips non-numeric characters and clamps decimal places to 2", () => {
    expect(sanitizeDecimalInput("$1,234.567")).toBe("1234.56");
    expect(sanitizeDecimalInput("12.3.4")).toBe("12.34");
  });

  it("clamps integer digits to maxIntDigits", () => {
    expect(sanitizeDecimalInput("123456.78", 4)).toBe("1234.78");
  });
});

describe("computePaydayAllocationSummary", () => {
  it("computes sweep remainder and category totals accurately", () => {
    const summary = computePaydayAllocationSummary(
      2000,
      "ev1",
      [
        { bucketId: "ev1", proposedAmount: 1000, envelopeType: "EVERYDAY" },
        { bucketId: "b1", proposedAmount: 700, envelopeType: "BILL" },
        { bucketId: "g1", proposedAmount: 300, envelopeType: "GOAL" },
      ],
      { ev1: "1000", b1: "750", g1: "250" }
    );

    expect(summary.nonSweepAllocatedSum).toBe(1000);
    expect(summary.sweepPoolRemainder).toBe(1000);
    expect(summary.isDeficit).toBe(false);
    expect(summary.everydayAllocated).toBe(1000);
    expect(summary.billsAllocated).toBe(750);
    expect(summary.goalsAllocated).toBe(250);
  });

  it("flags deficit when non-sweep allocations exceed actual payday amount", () => {
    const summary = computePaydayAllocationSummary(
      1000,
      "ev1",
      [
        { bucketId: "ev1", proposedAmount: 0, envelopeType: "EVERYDAY" },
        { bucketId: "b1", proposedAmount: 1100, envelopeType: "BILL" },
      ],
      { ev1: "0", b1: "1100" }
    );

    expect(summary.sweepPoolRemainder).toBe(-100);
    expect(summary.isDeficit).toBe(true);
    expect(summary.everydayAllocated).toBe(0);
  });
});
