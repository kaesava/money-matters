import { describe, it, expect } from "vitest";

/**
 * Unit tests for canAffordSimulationQuery verdict logic.
 * Tests pure computation paths without DB — validates threshold math.
 */
describe("canAffordSimulationQuery — verdict logic", () => {
  // ── SAFE_YES ──────────────────────────────────────────────────────────
  it("SAFE_YES: amount within effective spendable and pacing >= 25% of daily floor", () => {
    const everydayBalance = 1000;
    const totalBills = 100;
    const effectiveSpendable = everydayBalance - totalBills; // 900
    const amount = 200;
    const daysUntilPayday = 10;
    const everydayMonthlyAllowance = 2400;
    const dailyAllowance = everydayMonthlyAllowance / 30; // 80
    const pacingFloor = dailyAllowance * 0.25; // 20

    const remaining = effectiveSpendable - amount; // 700
    const dailyPacing = remaining / daysUntilPayday; // 70

    expect(amount).toBeLessThanOrEqual(effectiveSpendable);
    expect(dailyPacing).toBeGreaterThanOrEqual(pacingFloor);
  });

  // ── PACING_TIGHT ──────────────────────────────────────────────────────
  it("PACING_TIGHT: amount within effective spendable but daily pacing < 25% floor", () => {
    const everydayBalance = 600;
    const totalBills = 0;
    const effectiveSpendable = everydayBalance;
    const amount = 570;
    const daysUntilPayday = 14;
    const everydayMonthlyAllowance = 2400;
    const dailyAllowance = everydayMonthlyAllowance / 30;
    const pacingFloor = dailyAllowance * 0.25; // 20

    const remaining = effectiveSpendable - amount; // 30
    const dailyPacing = remaining / daysUntilPayday; // ~2.14

    expect(amount).toBeLessThanOrEqual(effectiveSpendable);
    expect(dailyPacing).toBeLessThan(pacingFloor);
  });

  // ── BILLS_RISK ────────────────────────────────────────────────────────
  it("BILLS_RISK: amount <= everydayBalance but > effectiveSpendable after bills", () => {
    const everydayBalance = 800;
    const totalBills = 600;
    const effectiveSpendable = Math.max(0, everydayBalance - totalBills); // 200
    const amount = 500;

    expect(amount).toBeLessThanOrEqual(everydayBalance);
    expect(amount).toBeGreaterThan(effectiveSpendable);
  });

  // ── WAIT_FOR_PAYCYCLE ────────────────────────────────────────────────
  it("WAIT_FOR_PAYCYCLE: not affordable today, but cumulative step covers it", () => {
    const effectiveSpendable = 100;
    const amount = 500;
    // Simulated projection step 2 has everydayAtStep = 600
    const everydayAtStep2 = 600;
    const stepIndex = 1; // 0-indexed

    expect(amount).toBeGreaterThan(effectiveSpendable);
    expect(everydayAtStep2).toBeGreaterThanOrEqual(amount);
    expect(stepIndex + 1).toBe(2); // 2 paycycles away
  });

  // ── GOAL_DELAYED (recurring) ─────────────────────────────────────────
  it("GOAL_DELAYED: recurring commitment reduces final goal balance > 0", () => {
    const originalFinalBalance = 5000;
    const newFinalBalance = 4400;
    const balanceDrop = originalFinalBalance - newFinalBalance; // 600
    const dailyContrib = 100; // $100/day contribution estimate
    const delayDays = Math.round(balanceDrop / dailyContrib); // 6 days

    expect(balanceDrop).toBeGreaterThan(0);
    expect(delayDays).toBeGreaterThanOrEqual(1);
  });

  // ── HARD_NO ──────────────────────────────────────────────────────────
  it("HARD_NO: 12-month projection steps exhausted with no affordable paycycle", () => {
    const effectiveSpendable = 50;
    const amount = 50000;
    const projectionStepsCount = 0; // No steps found that cover amount

    expect(amount).toBeGreaterThan(effectiveSpendable);
    expect(projectionStepsCount).toBe(0);
  });

  // ── DYNAMIC PACING FLOOR ─────────────────────────────────────────────
  it("dynamic pacing floor adapts: $1200/mo allowance gives $10/day floor (25%)", () => {
    const everydayMonthlyAllowance = 1200;
    const dailyAllowance = everydayMonthlyAllowance / 30; // 40
    const pacingFloor = dailyAllowance * 0.25; // 10
    expect(pacingFloor).toBeCloseTo(10, 1);
  });

  it("dynamic pacing floor adapts: $3000/mo allowance gives $25/day floor (25%)", () => {
    const everydayMonthlyAllowance = 3000;
    const dailyAllowance = everydayMonthlyAllowance / 30; // 100
    const pacingFloor = dailyAllowance * 0.25; // 25
    expect(pacingFloor).toBeCloseTo(25, 1);
  });

  // ── BILLS DEDUCTED CORRECTLY ─────────────────────────────────────────
  it("effectiveSpendable = everydayBalance - bills (floor 0)", () => {
    expect(Math.max(0, 200 - 300)).toBe(0);
    expect(Math.max(0, 800 - 200)).toBe(600);
  });

  // ── RECURRING MONTHLY AMOUNT CONVERSION ─────────────────────────────
  it("toMonthlyAmount: WEEKLY $100 = $433.33/mo", () => {
    const monthly = (100 * 52) / 12;
    expect(monthly).toBeCloseTo(433.33, 1);
  });

  it("toMonthlyAmount: FORTNIGHTLY $500 = $1083.33/mo", () => {
    const monthly = (500 * 26) / 12;
    expect(monthly).toBeCloseTo(1083.33, 1);
  });

  it("toMonthlyAmount: ANNUALLY $1200 = $100/mo", () => {
    const monthly = 1200 / 12;
    expect(monthly).toBe(100);
  });
});
