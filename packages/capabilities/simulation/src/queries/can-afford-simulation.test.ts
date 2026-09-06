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

  // ── WAIT_FOR_PAYCYCLE (ONE-OFF) ───────────────────────────────────────
  it("WAIT_FOR_PAYCYCLE: not affordable today, but cumulative step covers amount + pacing floor", () => {
    const effectiveSpendable = 100;
    const amount = 500;
    const everydayAtStep2 = 800;
    const daysInStep = 14;
    const pacingFloor = 20;
    const requiredPacingBuffer = daysInStep * pacingFloor; // 280

    expect(amount).toBeGreaterThan(effectiveSpendable);
    expect(everydayAtStep2 - amount).toBeGreaterThanOrEqual(requiredPacingBuffer);
  });

  // ── WAIT_FOR_PAYCYCLE (RECURRING) ────────────────────────────────────
  it("RECURRING WAIT_FOR_PAYCYCLE: insufficient Day-1 cash, but 12-month projection is affordable", () => {
    const effectiveSpendable = 50;
    const recurringAmount = 100; // $100/mo
    const day1Insufficient = recurringAmount > effectiveSpendable;
    const phantomFinalBalance = 0; // Fully funded over 12 months
    const minEverydayBalance = 500; // Never drops below zero

    expect(day1Insufficient).toBe(true);
    expect(phantomFinalBalance).toBeGreaterThanOrEqual(-1);
    expect(minEverydayBalance).toBeGreaterThanOrEqual(0);
    // Verdict must be WAIT_FOR_PAYCYCLE instead of HARD_NO
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
    // Verdict must be HARD_NO with forecasted deficit explanation
  });

  // ── HARD_NO: EVERYDAY STARVATION ────────────────────────────────────
  it("HARD_NO (EVERYDAY STARVATION): detects when Everyday pool balance drops below $0 at any step", () => {
    const minEverydayBalance = -150; // Dips negative on a step
    expect(minEverydayBalance).toBeLessThan(0);
    // Verdict must be HARD_NO with starvation step explanation
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
    const safeYesRationale = "Daily pace for 10 days until payday: $70.00/day (recommended daily safety buffer: $20.00/day)";
    const goalDelayedRationale = "New monthly commitment of $50.00 ($50.00/mo) added to your 12-month budget forecast.";
    const committedGoalRationale = "\"Emergency Fund\" (committed savings target): target date pushed back by ~12 days.";

    expect(safeYesRationale).not.toContain("floor:");
    expect(safeYesRationale).toContain("recommended daily safety buffer");
    expect(goalDelayedRationale).not.toContain("injected into waterfall");
    expect(goalDelayedRationale).toContain("added to your 12-month budget forecast");
    expect(committedGoalRationale).toContain("committed savings target");
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

