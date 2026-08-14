import { describe, it, expect } from "vitest";
import { runAllocationEngine, EngineBucket } from "./allocation-engine.js";

describe("paycheck cascade allocation engine", () => {
  it("allocates regular bills, committed savings, and sweeps residual excess everyday", () => {
    const buckets: EngineBucket[] = [
      {
        id: "rent-id",
        name: "Rent / Mortgage",
        type: "REGULAR",
        isCommitted: false,
        monthlyAmount: 1200,
        targetAmount: null,
        targetDate: null,
        currentBalance: 0,
      },
      {
        id: "holiday-committed-id",
        name: "Car Insurance",
        type: "GOAL",
        isCommitted: true,
        monthlyAmount: null,
        targetAmount: 500,
        targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(), // ~2 months out
        currentBalance: 100,
      },
      {
        id: "uncommitted-id",
        name: "Holiday",
        type: "GOAL",
        isCommitted: false,
        monthlyAmount: null,
        targetAmount: 1000,
        targetDate: null, // defaults to 12 months remaining
        currentBalance: 0,
      },
      {
        id: "everyday-id",
        name: "Everyday Spending",
        type: "EVERYDAY",
        isCommitted: false,
        isSurplusTarget: true,
        monthlyAmount: null,
        targetAmount: null,
        targetDate: null,
        currentBalance: 150,
      },

    ];

    const result = runAllocationEngine({
      incomeAmount: 3000,
      buckets,
      paycheckDate: new Date(),
      paycheckFrequencyDays: 14,
    });

    expect(result.status).toBe("OK");
    
    // Prorated Rent (REGULAR): 1200 * 12 / 26 = 553.85
    const rentLine = result.lines.find((l) => l.bucketId === "rent-id");
    expect(rentLine?.proposedAmount).toBe(553.85);

    // Prorated Savings Committed: (500 - 100) / 2 months = 200 monthly target -> 200 * 12 / 26 = 92.31
    const carLine = result.lines.find((l) => l.bucketId === "holiday-committed-id");
    expect(carLine?.proposedAmount).toBe(92.31);

    // Prorated Savings Uncommitted: (1000 - 0) / 12 months = 83.33 monthly target -> 83.33 * 12 / 26 = 38.46
    const holidayLine = result.lines.find((l) => l.bucketId === "uncommitted-id");
    expect(holidayLine?.proposedAmount).toBe(38.46);

    // Everyday Excess: 3000 - (553.85 + 92.31 + 38.46) = 2315.38
    const everydayLine = result.lines.find((l) => l.bucketId === "everyday-id");
    expect(everydayLine?.proposedAmount).toBe(2315.38);
  });

  it("prioritises deficit repair (Step 0) for negative balances before funding bills or goals", () => {
    const buckets: EngineBucket[] = [
      {
        id: "overspent-everyday",
        name: "Everyday Cash",
        type: "EVERYDAY",
        isCommitted: false,
        monthlyAmount: null,
        targetAmount: 500,
        targetDate: null,
        currentBalance: -150, // Negative balance of -$150
      },
      {
        id: "rent-id",
        name: "Rent / Mortgage",
        type: "REGULAR",
        isCommitted: false,
        monthlyAmount: 1000,
        targetAmount: null,
        targetDate: null,
        currentBalance: 0,
      },
    ];

    const result = runAllocationEngine({
      incomeAmount: 1000,
      buckets,
      paycheckDate: new Date(),
      paycheckFrequencyDays: 14,
    });

    expect(result.status).toBe("OK");

    // Deficit repair ($150) + Everyday Top-Up ($388.46 remaining after Rent) = $538.46 total allocated to Everyday
    const everydayLine = result.lines.find((l) => l.bucketId === "overspent-everyday");
    expect(everydayLine?.proposedAmount).toBe(538.46);

    // Prorated Rent: 1000 * 12 / 26 = 461.54
    const rentLine = result.lines.find((l) => l.bucketId === "rent-id");
    expect(rentLine?.proposedAmount).toBe(461.54);
  });

  it("falls back to the first available category if no explicit default excess bucket is defined", () => {
    const buckets: EngineBucket[] = [
      {
        id: "savings-goal",
        name: "Emergency Goal",
        type: "GOAL",
        currentBalance: 0,
      },
    ];

    const result = runAllocationEngine({
      incomeAmount: 500,
      buckets,
      paycheckDate: new Date(),
      paycheckFrequencyDays: 14,
    });

    expect(result.status).toBe("OK");
    const savingsLine = result.lines.find((l) => l.bucketId === "savings-goal");
    expect(savingsLine?.proposedAmount).toBe(500);
  });

  it("returns INSUFFICIENT status when income does not cover non-sweep requirements at all", () => {
    const buckets: EngineBucket[] = [
      {
        id: "rent-bill",
        name: "Rent Bill",
        type: "REGULAR",
        monthlyAmount: 2600, // 2600 * 12 / 26 = 1200 needed per paycheck
        currentBalance: 0,
      },
      {
        id: "utility-bill",
        name: "Utility Bill",
        type: "REGULAR",
        monthlyAmount: 260, // 120 needed per paycheck
        currentBalance: 0,
      },
      {
        id: "everyday-spending",
        name: "Everyday Spending",
        type: "EVERYDAY",
        currentBalance: 0,
      },
    ];

    // Income is only 500, which is consumed by rent-bill (500), leaving utility-bill with 0
    const result = runAllocationEngine({
      incomeAmount: 500,
      buckets,
      paycheckDate: new Date(),
      paycheckFrequencyDays: 14,
    });

    expect(result.status).toBe("INSUFFICIENT");
    const billLine = result.lines.find((l) => l.bucketId === "rent-bill");
    expect(billLine?.proposedAmount).toBe(500);
    const utilityLine = result.lines.find((l) => l.bucketId === "utility-bill");
    expect(utilityLine?.proposedAmount).toBe(0);
  });
});
