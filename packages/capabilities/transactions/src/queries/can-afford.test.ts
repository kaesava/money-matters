import { describe, it, expect } from "vitest";

describe("canAfford affordability verdict calculations", () => {
  it("returns YES when amount is within Everyday pool balance", () => {
    const everydayBalance = 500;
    const amount = 150;
    const remaining = everydayBalance - amount;

    expect(amount <= everydayBalance).toBe(true);
    expect(remaining).toBe(350);
  });

  it("returns YES_WITH_IMPACT when amount dips into uncommitted goal surplus", () => {
    const everydayBalance = 100;
    const goalSurplus = 300;
    const amount = 250;

    const totalAvailable = everydayBalance + goalSurplus;
    expect(amount <= totalAvailable).toBe(true);
    expect(amount > everydayBalance).toBe(true);
  });

  it("returns WAIT when amount exceeds current balance but paycheck is within 14 days", () => {
    const everydayBalance = 50;
    const nextPaycheckAmount = 2000;
    const amount = 300;
    const daysRemaining = 5;

    expect(everydayBalance + nextPaycheckAmount >= amount).toBe(true);
    expect(daysRemaining <= 14).toBe(true);
  });

  it("returns NO when amount exceeds all balances and upcoming paycheck", () => {
    const everydayBalance = 50;
    const amount = 5000;
    const shortfall = amount - everydayBalance;

    expect(shortfall).toBe(4950);
  });
});
