import { describe, it, expect, vi } from "vitest";
import {
  computeHorizonBreakdown,
  computeMonthlyCashFlow,
  computeTopPools,
  buildIncomeSplitAnalytics,
  createEmptyIncomeSplitAnalytics,
  ProcessedLine,
  ProcessedPlan,
} from "./income-split-analytics-processors";
import { getIncomeSplitAnalyticsQuery } from "./get-income-split-analytics.query";
import { getAnalyticsCutoff } from "./income-split-analytics-buckets";
import { DbOrTx } from "@money-matters/db";


describe("Income Split Analytics Processors", () => {
  const refDate = new Date("2026-10-18T10:00:00Z");

  it("computes horizon breakdown correctly across everyday, bills, and goals", () => {
    const lines: ProcessedLine[] = [
      { planId: "p1", envelopeId: "e1", envelopeName: "Living", envelopeType: "EVERYDAY", amount: 1000 },
      { planId: "p1", envelopeId: "e2", envelopeName: "Electricity", envelopeType: "SCHEDULED_BILL", amount: 500 },
      { planId: "p1", envelopeId: "e3", envelopeName: "Groceries Extra", envelopeType: "FLEXIBLE_BILL", amount: 500 },
      { planId: "p1", envelopeId: "e4", envelopeName: "Vacation", envelopeType: "TARGET_GOAL", amount: 500 },
      { planId: "p1", envelopeId: "e5", envelopeName: "Emergency", envelopeType: "ONGOING_GOAL", amount: 500 },
    ];

    const breakdown = computeHorizonBreakdown(lines);
    expect(breakdown.everyday).toBe(1000);
    expect(breakdown.bills).toBe(1000);
    expect(breakdown.goals).toBe(1000);
    expect(breakdown.totalOutflow).toBe(3000);
    expect(breakdown.percentages.everyday).toBe(33);
    expect(breakdown.percentages.bills).toBe(33);
    expect(breakdown.percentages.goals).toBe(34);
  });

  it("computes monthly and weekly cash flow buckets mapping total income and sweep allocation", () => {
    const cutoffDate30D = getAnalyticsCutoff("30D", refDate);
    const plans: ProcessedPlan[] = [
      { id: "p1", date: new Date("2026-10-17T00:00:00Z"), totalIncomeAmount: 3000 },
      { id: "p2", date: new Date("2026-10-10T00:00:00Z"), totalIncomeAmount: 2500 },
    ];
    const lines: ProcessedLine[] = [
      { planId: "p1", envelopeId: "sweep-env", envelopeName: "Living", envelopeType: "EVERYDAY", amount: 1200 },
      { planId: "p1", envelopeId: "other-env", envelopeName: "Bills", envelopeType: "SCHEDULED_BILL", amount: 1800 },
      { planId: "p2", envelopeId: "sweep-env", envelopeName: "Living", envelopeType: "EVERYDAY", amount: 800 },
    ];

    const weekly = computeMonthlyCashFlow(plans, lines, "sweep-env", "30D", cutoffDate30D, refDate);
    expect(weekly).toHaveLength(4);
    const totalWeeklyIncome = weekly.reduce((acc, w) => acc + w.income, 0);
    const totalWeeklySweep = weekly.reduce((acc, w) => acc + w.outflow, 0);
    expect(totalWeeklyIncome).toBe(5500);
    expect(totalWeeklySweep).toBe(2000);

    const cutoffDate90D = getAnalyticsCutoff("90D", refDate);
    const monthly = computeMonthlyCashFlow(plans, lines, "sweep-env", "90D", cutoffDate90D, refDate);
    expect(monthly).toHaveLength(3);
  });

  it("computes top allocation pools and aggregates remainder into otherPoolsAmount", () => {
    const lines: ProcessedLine[] = [
      { planId: "p1", envelopeId: "e1", envelopeName: "Env 1", envelopeType: "EVERYDAY", amount: 1000 },
      { planId: "p1", envelopeId: "e2", envelopeName: "Env 2", envelopeType: "SCHEDULED_BILL", amount: 900 },
      { planId: "p1", envelopeId: "e3", envelopeName: "Env 3", envelopeType: "SCHEDULED_BILL", amount: 800 },
      { planId: "p1", envelopeId: "e4", envelopeName: "Env 4", envelopeType: "TARGET_GOAL", amount: 700 },
      { planId: "p1", envelopeId: "e5", envelopeName: "Env 5", envelopeType: "TARGET_GOAL", amount: 600 },
      { planId: "p1", envelopeId: "e6", envelopeName: "Env 6", envelopeType: "FLEXIBLE_BILL", amount: 500 },
      { planId: "p1", envelopeId: "e7", envelopeName: "Env 7", envelopeType: "ONGOING_GOAL", amount: 400 },
    ];

    const { topPools, otherPoolsAmount } = computeTopPools(lines, 4900);
    expect(topPools).toHaveLength(5);
    expect(topPools[0].name).toBe("Env 1");
    expect(topPools[0].amount).toBe(1000);
    expect(topPools[4].name).toBe("Env 5");
    expect(otherPoolsAmount).toBe(900); // 500 + 400
  });

  it("handles empty plans safely returning empty DTO", () => {
    const emptyDto = createEmptyIncomeSplitAnalytics("90D", false);
    expect(emptyDto.isEmpty).toBe(true);
    expect(emptyDto.totalIncome).toBe(0);
    expect(emptyDto.totalOutflow).toBe(0);
    expect(emptyDto.topPools).toEqual([]);
  });

  it("builds filtered analytics with filteredSharePercentage", () => {
    const result = buildIncomeSplitAnalytics({
      rawPlans: [
        {
          id: "p1",
          totalIncomeAmount: "4000",
          expectedDate: "2026-10-15",
          actualDate: "2026-10-15",
          createdAt: new Date("2026-10-15T00:00:00Z"),
        },
      ],
      rawLines: [
        {
          planId: "p1",
          envelopeId: "env-target",
          proposedAmount: "1000",
          confirmedAmount: "1000",
          envelopeName: "Target Env",
          envelopeType: "EVERYDAY",
        },
        {
          planId: "p1",
          envelopeId: "env-other",
          proposedAmount: "3000",
          confirmedAmount: "3000",
          envelopeName: "Other Env",
          envelopeType: "SCHEDULED_BILL",
        },
      ],
      defaultSweepId: "env-target",
      timeframe: "30D",
      cutoffDate: getAnalyticsCutoff("30D", refDate),
      refDate,
      isFiltered: true,
      envelopeIdFilter: "env-target",
    });

    expect(result.isEmpty).toBe(false);
    expect(result.isFiltered).toBe(true);
    expect(result.filteredSharePercentage).toBe(25);
    expect(result.totalIncome).toBe(4000);
    expect(result.totalOutflow).toBe(4000);
  });
});

describe("getIncomeSplitAnalyticsQuery DB interaction", () => {
  it("queries allocation plans, envelopes, and lines using tenant/app scoping", async () => {
    const mockPlans = [
      {
        id: "plan-1",
        totalIncomeAmount: "5000",
        expectedDate: "2026-10-10",
        actualDate: "2026-10-10",
        createdAt: new Date("2026-10-10"),
      },
    ];
    const mockEnvelopes = [
      {
        id: "env-1",
        name: "Everyday Living",
        envelopeType: "EVERYDAY" as const,
        isSurplusTarget: true,
      },
    ];
    const mockLines = [
      {
        planId: "plan-1",
        envelopeId: "env-1",
        proposedAmount: "2500",
        confirmedAmount: "2500",
        envelopeName: "Everyday Living",
        envelopeType: "EVERYDAY" as const,
      },
    ];

    let queryCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockImplementation(() => {
            queryCallCount++;
            if (queryCallCount === 1) {
              return {
                orderBy: vi.fn().mockResolvedValue(mockPlans),
              };
            }
            if (queryCallCount === 2) {
              return Promise.resolve(mockEnvelopes);
            }
            return Promise.resolve(mockLines);
          }),
        })),
      })),
    };

    const res = await getIncomeSplitAnalyticsQuery(
      "tenant-1",
      "app-1",
      { timeframe: "90D" },
      mockDb as unknown as DbOrTx
    );

    expect(res.isEmpty).toBe(false);
    expect(res.totalIncome).toBe(5000);
    expect(res.totalOutflow).toBe(2500);
    expect(res.horizonBreakdown.everyday).toBe(2500);
  });
});
