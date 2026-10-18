import { describe, it, expect } from "vitest";
import { processSpendingAnalyticsRows } from "./get-spending-analytics.query";

describe("processSpendingAnalyticsRows", () => {
  const refDate = new Date("2026-10-18T10:00:00Z");

  it("computes accurate horizon, monthly, and top envelope aggregations", () => {
    const rows = [
      {
        id: "1",
        amount: "100.00",
        flowType: "DEBIT" as const,
        transactionType: "EXPENSE",
        recordedAt: new Date("2026-08-15T10:00:00Z"),
        envelopeId: "env-1",
        envelopeName: "Groceries",
        envelopeType: "EVERYDAY" as const,
        note: "Woolworths",
      },
      {
        id: "2",
        amount: "200.00",
        flowType: "DEBIT" as const,
        transactionType: "EXPENSE",
        recordedAt: new Date("2026-08-20T10:00:00Z"),
        envelopeId: "env-2",
        envelopeName: "Electricity",
        envelopeType: "SCHEDULED_BILL" as const,
        note: "Origin Energy",
      },
      {
        id: "3",
        amount: "50.00",
        flowType: "DEBIT" as const,
        transactionType: "EXPENSE",
        recordedAt: new Date("2026-09-05T10:00:00Z"),
        envelopeId: "env-3",
        envelopeName: "Holiday Goal",
        envelopeType: "TARGET_GOAL" as const,
        note: "Flight ticket",
      },
      {
        id: "4",
        amount: "1000.00",
        flowType: "CREDIT" as const,
        transactionType: "INCOME_SPLIT",
        recordedAt: new Date("2026-08-01T10:00:00Z"),
        envelopeId: "env-1",
        envelopeName: "Groceries",
        envelopeType: "EVERYDAY" as const,
      },
    ];

    const result = processSpendingAnalyticsRows(rows, "90D", refDate);

    expect(result.isEmpty).toBe(false);
    expect(result.totalOutflow).toBe(350);
    expect(result.totalIncome).toBe(1000);
    expect(result.horizonBreakdown.everyday).toBe(100);
    expect(result.horizonBreakdown.bills).toBe(200);
    expect(result.horizonBreakdown.goals).toBe(50);
    expect(result.horizonBreakdown.percentages.everyday).toBe(28.57);
    expect(result.horizonBreakdown.percentages.bills).toBe(57.14);
    expect(result.horizonBreakdown.percentages.goals).toBe(14.29);

    // 90D pre-initializes 3 calendar months (Aug, Sep, Oct)
    expect(result.monthlyCashFlow).toHaveLength(3);
    expect(result.monthlyCashFlow[0].monthKey).toBe("2026-08");
    expect(result.monthlyCashFlow[0].income).toBe(1000);
    expect(result.monthlyCashFlow[0].outflow).toBe(300);
    expect(result.monthlyCashFlow[0].net).toBe(700);

    expect(result.topPools).toHaveLength(3);
    expect(result.topPools[0].name).toBe("Electricity");
    expect(result.topPools[0].amount).toBe(200);
    expect(result.topPools[1].name).toBe("Groceries");
    expect(result.topPools[2].name).toBe("Holiday Goal");
    expect(result.otherPoolsAmount).toBe(0);
  });

  it("handles filtered query and extracts top payees accurately", () => {
    const rows = [
      {
        id: "1",
        amount: "120.00",
        flowType: "DEBIT" as const,
        transactionType: "EXPENSE",
        recordedAt: new Date("2026-08-15T10:00:00Z"),
        envelopeId: "env-1",
        envelopeName: "Groceries",
        envelopeType: "EVERYDAY" as const,
        note: "Woolworths Bondi",
      },
      {
        id: "2",
        amount: "80.00",
        flowType: "DEBIT" as const,
        transactionType: "EXPENSE",
        recordedAt: new Date("2026-08-22T10:00:00Z"),
        envelopeId: "env-1",
        envelopeName: "Groceries",
        envelopeType: "EVERYDAY" as const,
        note: "Coles Supermarkets",
      },
    ];

    const result = processSpendingAnalyticsRows(rows, "90D", refDate, undefined, true);
    expect(result.isFiltered).toBe(true);
    expect(result.topPayees).toHaveLength(2);
    expect(result.topPayees[0].name).toBe("Woolworths Bondi");
    expect(result.topPayees[0].amount).toBe(120);
    expect(result.topPayees[0].percentage).toBe(60);
  });

  it("handles empty rows safely without divide-by-zero errors", () => {
    const result = processSpendingAnalyticsRows([], "30D", refDate);
    expect(result.isEmpty).toBe(true);
    expect(result.totalOutflow).toBe(0);
    expect(result.totalIncome).toBe(0);
    expect(result.horizonBreakdown.percentages.everyday).toBe(0);
    expect(result.monthlyCashFlow).toHaveLength(4); // 4 weekly buckets
    expect(result.topPools).toHaveLength(0);
    expect(result.otherPoolsAmount).toBe(0);
  });
});
