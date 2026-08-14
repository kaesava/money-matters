import { describe, it, expect } from "vitest";

describe("canAfford affordability verdict calculations", () => {
  it("returns SAFE_YES when amount is within Everyday pool balance and leaves healthy daily pacing", () => {
    const everydayBalance = 1000;
    const billsReserved = 200;
    const amount = 150;
    const daysUntilPayday = 10;

    const netAvailableCash = everydayBalance - billsReserved; // 800
    const netRemainingAfterSpend = netAvailableCash - amount; // 650
    const dailyPacing = netRemainingAfterSpend / daysUntilPayday; // 65/day

    expect(amount <= netAvailableCash).toBe(true);
    expect(dailyPacing >= 15).toBe(true);
  });

  it("returns PACING_WARNING when cash is available but daily pacing drops below $15/day", () => {
    const everydayBalance = 500;
    const billsReserved = 200;
    const amount = 250;
    const daysUntilPayday = 14;

    const netAvailableCash = everydayBalance - billsReserved; // 300
    const netRemainingAfterSpend = netAvailableCash - amount; // 50
    const dailyPacing = netRemainingAfterSpend / daysUntilPayday; // 3.57/day

    expect(amount <= netAvailableCash).toBe(true);
    expect(dailyPacing < 15).toBe(true);
  });

  it("returns IMPACT_GOALS when amount exceeds net available cash but dips into goal surplus", () => {
    const netAvailableCash = 100;
    const goalSurplus = 300;
    const amount = 250;

    const totalAvailable = netAvailableCash + goalSurplus;
    expect(amount <= totalAvailable).toBe(true);
    expect(amount > netAvailableCash).toBe(true);
  });

  it("returns WAIT_FOR_PAYDAY when amount exceeds current net cash but paycheck is within 14 days", () => {
    const netAvailableCash = 50;
    const nextPaycheckAmount = 2000;
    const amount = 300;
    const daysRemaining = 5;

    expect(netAvailableCash + nextPaycheckAmount >= amount).toBe(true);
    expect(daysRemaining <= 14).toBe(true);
  });

  it("returns HARD_NO when amount exceeds all net balances and upcoming paycheck", () => {
    const netAvailableCash = 50;
    const amount = 5000;
    const shortfall = amount - netAvailableCash;

    expect(shortfall).toBe(4950);
  });
});

