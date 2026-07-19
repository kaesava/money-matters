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
        isDefaultExcess: false,
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
        isDefaultExcess: false,
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
        isDefaultExcess: false,
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
        isDefaultExcess: true,
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
      paycheckFrequencyDays: 14, // Fortnightly paycheck proration factor ~0.4599
    });

    expect(result.status).toBe("OK");
    
    // Prorated Rent (REGULAR): 1200 * (14 / 30.4375) ~ 551.95
    const rentLine = result.lines.find((l) => l.bucketId === "rent-id");
    expect(rentLine?.proposedAmount).toBe(551.95);

    // Prorated Savings Committed: (500 - 100) / 2 months = 200 monthly target.
    // Prorated fortnightly: 200 * (14 / 30.4375) ~ 91.99
    const carLine = result.lines.find((l) => l.bucketId === "holiday-committed-id");
    expect(carLine?.proposedAmount).toBe(91.99);

    // Prorated Savings Uncommitted: (1000 - 0) / 12 months = 83.33 monthly target.
    // Prorated fortnightly: 83.33 * (14 / 30.4375) ~ 38.33
    const holidayLine = result.lines.find((l) => l.bucketId === "uncommitted-id");
    expect(holidayLine?.proposedAmount).toBe(38.33);

    // Everyday Excess: 3000 - (551.95 + 91.99 + 38.33) = 2317.73
    const everydayLine = result.lines.find((l) => l.bucketId === "everyday-id");
    expect(everydayLine?.proposedAmount).toBe(2317.73);
  });
});
