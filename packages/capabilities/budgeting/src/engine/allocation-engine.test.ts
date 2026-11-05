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

    // Exact remaining paychecks divisor: (500 - 100) / 4 fortnights = $100 per paycheck
    const carLine = result.lines.find((l) => l.bucketId === "holiday-committed-id");
    expect(carLine?.proposedAmount).toBe(100);

    // Prorated Savings Uncommitted: (1000 - 0) / 26 paychecks = 38.46
    const holidayLine = result.lines.find((l) => l.bucketId === "uncommitted-id");
    expect(holidayLine?.proposedAmount).toBe(38.46);

    // Everyday Excess: 3000 - (553.85 + 100 + 38.46) = 2307.69
    const everydayLine = result.lines.find((l) => l.bucketId === "everyday-id");
    expect(everydayLine?.proposedAmount).toBe(2307.69);
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

  it("handles zero income and fallback when no everyday bucket exists gracefully", () => {
    const buckets: EngineBucket[] = [
      {
        id: "rent-bill",
        name: "Rent Bill",
        type: "REGULAR",
        monthlyAmount: 1000,
        currentBalance: 0,
      },
    ];

    const result = runAllocationEngine({
      incomeAmount: 0,
      buckets,
      paycheckDate: new Date(),
      paycheckFrequencyDays: 14,
    });

    expect(result.status).toBe("INSUFFICIENT");
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].proposedAmount).toBe(0);
  });

  it("allocates 100% of shortfall for upcoming bills due before the next payday in Step 1", () => {
    const buckets: EngineBucket[] = [
      {
        id: "bills-pool",
        name: "Bills Pool",
        type: "REGULAR",
        isEssential: true,
        monthlyAmount: 2000,
        currentBalance: 200, // Has $200
      },
      {
        id: "everyday-pool",
        name: "Everyday Pool",
        type: "EVERYDAY",
        monthlyAmount: 600,
        currentBalance: 0,
      },
      {
        id: "surplus-pool",
        name: "Offset Surplus",
        type: "GOAL",
        isSurplusTarget: true,
        currentBalance: 0,
      },
    ];

    // Bill of $2,000 due in 3 days (before next payday in 14 days)
    const paycheckDate = new Date("2026-09-01T00:00:00Z");
    const result = runAllocationEngine({
      incomeAmount: 2500,
      buckets,
      paycheckDate,
      paycheckFrequencyDays: 14,
      upcomingExpenses: [
        {
          poolId: "bills-pool",
          name: "Rent",
          amount: 2000,
          dueDate: "2026-09-04",
          isEssential: true,
        },
      ],
    });

    expect(result.status).toBe("OK");
    const billsLine = result.lines.find((l) => l.bucketId === "bills-pool");
    // Shortfall is $2000 - $200 = $1800. Bills pool must receive $1800!
    expect(billsLine?.proposedAmount).toBe(1800);
    // Remaining $700 cascades: Everyday gets cycle allowance ($600 * 12 / 26 = $276.92), rest to Surplus
    const everydayLine = result.lines.find((l) => l.bucketId === "everyday-pool");
    expect(everydayLine?.proposedAmount).toBe(276.92);
    const surplusLine = result.lines.find((l) => l.bucketId === "surplus-pool");
    expect(surplusLine?.proposedAmount).toBe(423.08);
  });

  it("prioritizes essential bills due before next pay ahead of deficit repair when income is scarce", () => {
    const buckets: EngineBucket[] = [
      {
        id: "rent-pool",
        name: "Rent",
        type: "REGULAR",
        isEssential: true,
        monthlyAmount: 1000,
        currentBalance: 0,
      },
      {
        id: "everyday-pool",
        name: "Everyday Overspent",
        type: "EVERYDAY",
        currentBalance: -300, // Negative balance of -$300
      },
    ];

    const paycheckDate = new Date("2026-09-01T00:00:00Z");
    // Income is only $1,100. Rent of $1,000 due in 2 days.
    const result = runAllocationEngine({
      incomeAmount: 1100,
      buckets,
      paycheckDate,
      paycheckFrequencyDays: 14,
      upcomingExpenses: [
        {
          poolId: "rent-pool",
          name: "Rent",
          amount: 1000,
          dueDate: "2026-09-03",
          isEssential: true,
        },
      ],
    });

    expect(result.status).toBe("OK");
    // Rent is 100% protected first ($1,000)
    const rentLine = result.lines.find((l) => l.bucketId === "rent-pool");
    expect(rentLine?.proposedAmount).toBe(1000);
    // Remaining $100 goes to deficit repair for Everyday
    const everydayLine = result.lines.find((l) => l.bucketId === "everyday-pool");
    expect(everydayLine?.proposedAmount).toBe(100);
  });
});
