import { describe, it, expect } from "vitest";
import { runAllocationEngine, EngineBucket } from "./allocation-engine.js";

describe("paycheck cascade allocation engine - extended scenarios", () => {
  it("funds 100% of remaining gap when a goal's target date is on or before the next payday", () => {
    const paycheckDate = new Date("2026-09-01T00:00:00Z");
    const buckets: EngineBucket[] = [
      {
        id: "holiday-goal",
        name: "Holiday Deposit",
        type: "GOAL",
        isCommitted: true,
        targetAmount: 1000,
        targetDate: "2026-09-05", // Due in 4 days (before next pay on 2026-09-15)
        currentBalance: 200, // $800 gap
      },
      {
        id: "surplus-pool",
        name: "Surplus",
        type: "GOAL",
        isSurplusTarget: true,
        currentBalance: 0,
      },
    ];

    const result = runAllocationEngine({
      incomeAmount: 2000,
      buckets,
      paycheckDate,
      paycheckFrequencyDays: 14,
    });

    expect(result.status).toBe("OK");
    const holidayLine = result.lines.find((l) => l.bucketId === "holiday-goal");
    // Receives 100% of the $800 gap
    expect(holidayLine?.proposedAmount).toBe(800);
    const surplusLine = result.lines.find((l) => l.bucketId === "surplus-pool");
    expect(surplusLine?.proposedAmount).toBe(1200);
  });

  it("allocates full cycle allowance for Everyday allowance", () => {
    const buckets: EngineBucket[] = [
      {
        id: "everyday-pool",
        name: "Everyday Cash",
        type: "EVERYDAY",
        monthlyAmount: 700, // Monthly $700 -> fortnightly cycle is $323.08
        currentBalance: 200,
      },
      {
        id: "surplus-pool",
        name: "Surplus",
        type: "GOAL",
        isSurplusTarget: true,
        currentBalance: 0,
      },
    ];

    const result = runAllocationEngine({
      incomeAmount: 1000,
      buckets,
      paycheckDate: new Date("2026-09-01T00:00:00Z"),
      paycheckFrequencyDays: 14,
    });

    expect(result.status).toBe("OK");
    const everydayLine = result.lines.find((l) => l.bucketId === "everyday-pool");
    // Full fortnightly allowance = $700 * 12 / 26 = $323.08
    expect(everydayLine?.proposedAmount).toBe(323.08);
  });

  it("isolates private pools: partner A income never allocates to partner B private pool", () => {
    const buckets: EngineBucket[] = [
      {
        id: "shared-rent",
        name: "Shared Rent",
        type: "REGULAR",
        isEssential: true,
        monthlyAmount: 1200,
        currentBalance: 0,
      },
      {
        id: "partner-b-private-pool",
        name: "Partner B Private Savings",
        type: "GOAL",
        isPrivate: true,
        userId: "user-b",
        monthlyAmount: null,
        targetAmount: 1000,
        currentBalance: 0,
      },
      {
        id: "partner-a-everyday",
        name: "Partner A Everyday",
        type: "EVERYDAY",
        isSurplusTarget: true,
        userId: "user-a",
        currentBalance: 0,
      },
    ];

    const result = runAllocationEngine({
      incomeAmount: 2000,
      incomeUserId: "user-a", // Partner A earned this paycheck
      buckets,
      paycheckDate: new Date("2026-09-01T00:00:00Z"),
      paycheckFrequencyDays: 14,
    });

    expect(result.status).toBe("OK");
    const partnerBLine = result.lines.find((l) => l.bucketId === "partner-b-private-pool");
    // Partner B's private pool receives $0 from Partner A's paycheck!
    expect(partnerBLine?.proposedAmount).toBe(0);
    const sharedRentLine = result.lines.find((l) => l.bucketId === "shared-rent");
    expect(sharedRentLine?.proposedAmount).toBeGreaterThan(0);
  });

  it("prioritizes everyday living allowance ahead of committed savings goals when income is tight", () => {
    const buckets: EngineBucket[] = [
      {
        id: "rent-pool",
        name: "Rent",
        type: "REGULAR",
        isEssential: true,
        monthlyAmount: 1300, // 1300 * 12 / 26 = $600
        currentBalance: 0,
      },
      {
        id: "everyday-pool",
        name: "Groceries & Fuel",
        type: "EVERYDAY",
        monthlyAmount: 650, // 650 * 12 / 26 = $300
        currentBalance: 0,
      },
      {
        id: "holiday-goal",
        name: "Japan Holiday",
        type: "GOAL",
        isCommitted: true,
        targetAmount: 5000,
        targetDate: "2026-10-01",
        currentBalance: 0,
      },
      {
        id: "surplus-pool",
        name: "Mortgage Offset",
        type: "GOAL",
        isSurplusTarget: true,
        currentBalance: 0,
      },
    ];

    // Income is only $950.
    // 1. Rent takes $600.
    // 2. Everyday takes $300 (Total $900).
    // 3. Goal receives remaining $50 (instead of taking the money before groceries!).
    const result = runAllocationEngine({
      incomeAmount: 950,
      buckets,
      paycheckDate: new Date("2026-09-01T00:00:00Z"),
      paycheckFrequencyDays: 14,
    });

    expect(result.status).toBe("OK");
    const rentLine = result.lines.find((l) => l.bucketId === "rent-pool");
    expect(rentLine?.proposedAmount).toBe(600);

    const everydayLine = result.lines.find((l) => l.bucketId === "everyday-pool");
    expect(everydayLine?.proposedAmount).toBe(300);

    const goalLine = result.lines.find((l) => l.bucketId === "holiday-goal");
    expect(goalLine?.proposedAmount).toBe(50);
  });

  it("covers bills due in the lookahead buffer window (e.g. +3 days past next payday)", () => {
    const buckets: EngineBucket[] = [
      {
        id: "bills-pool",
        name: "Bills",
        type: "REGULAR",
        isEssential: true,
        monthlyAmount: 1000,
        currentBalance: 0,
      },
      {
        id: "everyday-pool",
        name: "Everyday",
        type: "EVERYDAY",
        monthlyAmount: 400,
        currentBalance: 0,
      },
    ];

    // Paycheck on 2026-09-01, next payday in 14 days (2026-09-15).
    // Bill of $450 is due on 2026-09-17 (+2 days after next payday, within the 3-day buffer window).
    const result = runAllocationEngine({
      incomeAmount: 1200,
      buckets,
      paycheckDate: new Date("2026-09-01T00:00:00Z"),
      paycheckFrequencyDays: 14,
      dueBufferDays: 3,
      upcomingExpenses: [
        {
          poolId: "bills-pool",
          name: "Car Rego",
          amount: 450,
          dueDate: "2026-09-17",
          isEssential: true,
        },
      ],
    });

    expect(result.status).toBe("OK");
    const billsLine = result.lines.find((l) => l.bucketId === "bills-pool");
    // Due bill within the +3 day buffer is 100% funded in Step 1 ($450), and sinking prorated target is $461.54,
    // so it tops up to the greater cycle need ($461.54 total).
    expect(billsLine?.proposedAmount).toBe(461.54);
  });

  it("tops up the bills pool safety buffer floor cushion when eroded", () => {
    const buckets: EngineBucket[] = [
      {
        id: "bills-pool",
        name: "Bills",
        type: "REGULAR",
        isEssential: true,
        monthlyAmount: 1000,
        safetyBufferFloor: 300, // Wants a $300 cushion
        currentBalance: 50, // Only has $50 currently ($250 floor deficit)
      },
      {
        id: "everyday-pool",
        name: "Everyday",
        type: "EVERYDAY",
        monthlyAmount: 500,
        currentBalance: 0,
      },
      {
        id: "surplus-pool",
        name: "Offset",
        type: "GOAL",
        isSurplusTarget: true,
        currentBalance: 0,
      },
    ];

    const result = runAllocationEngine({
      incomeAmount: 1500,
      buckets,
      paycheckDate: new Date("2026-09-01T00:00:00Z"),
      paycheckFrequencyDays: 14,
    });

    expect(result.status).toBe("OK");
    const billsLine = result.lines.find((l) => l.bucketId === "bills-pool");
    // Sinking target = 1000 * 12 / 26 = $461.54.
    // Floor deficit = $300 - $50 = $250.
    // Total bills received = $250 (floor) + $211.54 (remaining delta of sinking) = $461.54.
    expect(billsLine?.proposedAmount).toBe(461.54);
  });
});
