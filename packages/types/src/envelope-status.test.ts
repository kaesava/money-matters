import { describe, it, expect } from "vitest";
import { computeEnvelopeStatus } from "./envelope-status.js";

describe("computeEnvelopeStatus", () => {
  it("marks out-of-window recurring bill as INACTIVE", () => {
    const res = computeEnvelopeStatus(
      {
        id: "b1",
        name: "Rent",
        envelopeType: "BILL",
        fundingMode: "RECURRING",
        currentBalance: 0,
        enteredAmount: "500.00",
        startDate: "2026-06-01",
      },
      "2026-05-01",
      "2026-05-15",
      "2026-06-01"
    );
    expect(res.balanceStatus).toBe("INACTIVE");
    expect(res.progressKind).toBe("INACTIVE");
  });

  it("marks recurring bill due after next payday as ON_TRACK when partially funded", () => {
    const res = computeEnvelopeStatus(
      {
        id: "b2",
        name: "Power",
        envelopeType: "BILL",
        fundingMode: "RECURRING",
        currentBalance: 100,
        enteredAmount: "200.00",
      },
      "2026-05-01",
      "2026-05-10",
      "2026-05-20"
    );
    expect(res.balanceStatus).toBe("ON_TRACK");
  });

  it("marks recurring bill due before next payday as PARTIAL or SHORTFALL or COVERED", () => {
    const partial = computeEnvelopeStatus(
      {
        id: "b3",
        name: "Water",
        envelopeType: "BILL",
        fundingMode: "RECURRING",
        currentBalance: 50,
        enteredAmount: "100.00",
      },
      "2026-05-01",
      "2026-05-15",
      "2026-05-10"
    );
    expect(partial.balanceStatus).toBe("PARTIAL");

    const covered = computeEnvelopeStatus(
      {
        id: "b4",
        name: "Internet",
        envelopeType: "BILL",
        fundingMode: "RECURRING",
        currentBalance: 100,
        enteredAmount: "100.00",
      },
      "2026-05-01",
      "2026-05-15",
      "2026-05-10"
    );
    expect(covered.balanceStatus).toBe("COVERED");
  });

  it("computes percentage progress for TARGET_BALANCE goal and flags overdue shortfall", () => {
    const onWay = computeEnvelopeStatus(
      {
        id: "g1",
        name: "Holiday",
        envelopeType: "GOAL",
        fundingMode: "TARGET_BALANCE",
        currentBalance: 250,
        targetAmount: "1000.00",
        endDate: "2026-12-01",
      },
      "2026-05-01",
      null,
      null
    );
    expect(onWay.progressPercentage).toBe(25);
    expect(onWay.balanceStatus).toBe("PARTIAL");

    const overdue = computeEnvelopeStatus(
      {
        id: "g2",
        name: "Tax",
        envelopeType: "GOAL",
        fundingMode: "TARGET_BALANCE",
        currentBalance: 500,
        targetAmount: "1000.00",
        endDate: "2026-04-01",
      },
      "2026-05-01",
      null,
      null
    );
    expect(overdue.balanceStatus).toBe("SHORTFALL");
  });
});
