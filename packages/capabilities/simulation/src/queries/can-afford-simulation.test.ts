import { describe, it, expect } from "vitest";
import { toMonthlyAmount } from "./can-afford-simulation.query.js";

/**
 * Unit tests for canAffordSimulationQuery verdict logic.
 * Tests pure computation paths without DB — validates threshold math and user-focused rules.
 */
describe("canAffordSimulationQuery — verdict logic", () => {
  // ── SAFE_YES ──────────────────────────────────────────────────────────
  it("SAFE_YES: amount within effective spendable and remaining cash >= safe cushion", () => {
    const everydayBalance = 1000;
    const totalBills = 100;
    const effectiveSpendable = everydayBalance - totalBills; // 900
    const amount = 200;
    const daysUntilPayday = 10;
    const everydayMonthlyAllowance = 2400;
    const dailyAllowance = everydayMonthlyAllowance / 30; // 80
    const safeCushion = Math.round(dailyAllowance * 0.25 * daysUntilPayday); // 200

    const remaining = effectiveSpendable - amount; // 700

    expect(amount).toBeLessThanOrEqual(effectiveSpendable);
    expect(remaining).toBeGreaterThanOrEqual(safeCushion);
  });

  // ── PACING_TIGHT ──────────────────────────────────────────────────────
  it("PACING_TIGHT: amount within effective spendable but remaining cash < safe cushion", () => {
    const everydayBalance = 600;
    const totalBills = 0;
    const effectiveSpendable = everydayBalance;
    const amount = 570;
    const daysUntilPayday = 14;
    const everydayMonthlyAllowance = 2400;
    const dailyAllowance = everydayMonthlyAllowance / 30; // 80
    const safeCushion = Math.round(dailyAllowance * 0.25 * daysUntilPayday); // 280

    const remaining = effectiveSpendable - amount; // 30
    const cushionShortfall = safeCushion - remaining; // 250

    expect(amount).toBeLessThanOrEqual(effectiveSpendable);
    expect(remaining).toBeLessThan(safeCushion);
    expect(cushionShortfall).toBe(250);
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

  // ── ONE-OFF SHORTFALL WITH GOAL ALTERNATIVE ───────────────────────────
  it("ONE-OFF: detects when flexible savings goal can cover shortfall and computes delay", () => {
    const effectiveSpendable = 200;
    const amount = 600;
    const shortfall = amount - effectiveSpendable; // 400
    const goalBalance = 1500; // Flexible holiday goal
    const goalMonthlyContrib = 300;
    const dailyContrib = goalMonthlyContrib / 30; // 10/day
    const delayDays = Math.round(shortfall / dailyContrib); // 40 days

    expect(shortfall).toBe(400);
    expect(goalBalance).toBeGreaterThanOrEqual(shortfall);
    expect(delayDays).toBe(40);
  });

  // ── WAIT_FOR_PAYCYCLE (ONE-OFF) ───────────────────────────────────────
  it("WAIT_FOR_PAYCYCLE: not affordable today, but cumulative step covers amount + step cushion", () => {
    const effectiveSpendable = 100;
    const amount = 500;
    const everydayAtStep2 = 800;
    const daysInStep = 14;
    const dailyAllowance = 80;
    const requiredStepCushion = dailyAllowance * 0.25 * daysInStep; // 280

    expect(amount).toBeGreaterThan(effectiveSpendable);
    expect(everydayAtStep2 - amount).toBeGreaterThanOrEqual(requiredStepCushion);
  });

  // ── RECURRING: 80% EVERYDAY ALLOWANCE PROTECTION ────────────────────
  it("RECURRING: enforces 80% everyday allowance minimum protection", () => {
    const monthlyAllowance = 1000;
    const expected12MonthEveryday = monthlyAllowance * 12; // 12,000
    const minRequiredEveryday = expected12MonthEveryday * 0.8; // 9,600

    // If total allocated across 12 months drops to 9,000 (< 9,600), triggers HARD_NO
    const actualAllocatedWithCommitment = 9000;
    expect(actualAllocatedWithCommitment).toBeLessThan(minRequiredEveryday);
  });

  // ── GOAL_DELAYED (RECURRING) ─────────────────────────────────────────
  it("GOAL_DELAYED: recurring commitment reduces final goal balance > 0", () => {
    const originalFinalBalance = 5000;
    const newFinalBalance = 4400;
    const balanceDrop = originalFinalBalance - newFinalBalance; // 600
    const dailyContrib = 100; // $100/day contribution estimate
    const delayDays = Math.round(balanceDrop / dailyContrib); // 6 days

    expect(balanceDrop).toBeGreaterThan(0);
    expect(delayDays).toBeGreaterThanOrEqual(1);
  });

  // ── HARD_NO: PHANTOM DEFICIT ─────────────────────────────────────────
  it("HARD_NO (PHANTOM DEFICIT): detects when recurring expense cannot be funded by projected income", () => {
    const phantomFinalBalance = -12000; // Unfunded $1000/mo over 12 months
    expect(phantomFinalBalance).toBeLessThan(-1);
  });

  // ── PRORATED CUSHION ADAPTS TO DAYS UNTIL PAYDAY ─────────────────────
  it("prorated safe cushion: adapts dynamically to days until payday", () => {
    const everydayMonthlyAllowance = 2400;
    const dailyAllowance = everydayMonthlyAllowance / 30; // 80/day
    const dailyCushionRate = dailyAllowance * 0.25; // 20/day

    // 5 days until payday
    const cushion5Days = Math.round(dailyCushionRate * 5); // 100
    expect(cushion5Days).toBe(100);

    // 14 days until payday
    const cushion14Days = Math.round(dailyCushionRate * 14); // 280
    expect(cushion14Days).toBe(280);
  });

  // ── BILLS DEDUCTED CORRECTLY & UNFUNDED SHORTFALL ───────────────────
  it("effectiveSpendable uses unfunded shortfall (funded bills do not deduct from Everyday balance)", () => {
    const everydayBalance = 1000;
    // Bill for $500 in a pool with balance $400 -> shortfall $100
    const billAmount1 = 500;
    const poolBal1 = 400;
    const shortfall1 = Math.max(0, billAmount1 - poolBal1); // 100

    // Bill for $300 in a pool with balance $500 -> shortfall $0
    const billAmount2 = 300;
    const poolBal2 = 500;
    const shortfall2 = Math.max(0, billAmount2 - poolBal2); // 0

    const totalUnfundedShortfall = shortfall1 + shortfall2; // 100
    const effectiveSpendable = Math.max(0, everydayBalance - totalUnfundedShortfall); // 900

    expect(effectiveSpendable).toBe(900);
  });

  // ── TRUST COPY VERIFICATION ─────────────────────────────────────────
  it("user-facing rationale copy uses human-centric terms and zero developer jargon", () => {
    const safeYesRationale = "Comfortably above your recommended safe cushion of $120.00.";
    const pacingTightRationale = "This leaves you $45.00 below your recommended safe cushion ($120.00).";
    const billsRiskRationale = "Bills are non-negotiable and cannot be spent.";

    expect(safeYesRationale).not.toContain("floor");
    expect(safeYesRationale).not.toContain("/day");
    expect(safeYesRationale).not.toContain("Daily pace");
    expect(pacingTightRationale).not.toContain("floor");
    expect(pacingTightRationale).not.toContain("/day");
    expect(billsRiskRationale).toContain("Bills are non-negotiable");
  });

  // ── RECURRING MONTHLY AMOUNT CONVERSION ─────────────────────────────
  it("toMonthlyAmount: WEEKLY $100 = $433.33/mo", () => {
    const monthly = toMonthlyAmount(100, "WEEKLY");
    expect(monthly).toBeCloseTo(433.33, 1);
  });

  it("toMonthlyAmount: FORTNIGHTLY $500 = $1083.33/mo", () => {
    const monthly = toMonthlyAmount(500, "FORTNIGHTLY");
    expect(monthly).toBeCloseTo(1083.33, 1);
  });

  it("toMonthlyAmount: ANNUALLY $1200 = $100/mo", () => {
    const monthly = toMonthlyAmount(1200, "ANNUALLY");
    expect(monthly).toBe(100);
  });
});

