import { SpendingTimeframe } from "@money-matters/types";

export interface AnalyticsBucketItem {
  key: string;
  label: string;
  income: number;
  outflow: number;
}

export function getMonthLabel(year: number, monthZeroIndex: number): string {
  const date = new Date(Date.UTC(year, monthZeroIndex, 1));
  return new Intl.DateTimeFormat("en-AU", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function getAnalyticsCutoff(timeframe: SpendingTimeframe, refDate: Date): Date {
  const d = new Date(refDate);
  if (timeframe === "30D") {
    // 28 days = 4 full 7-day weeks
    d.setUTCDate(d.getUTCDate() - 28);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  if (timeframe === "90D") {
    // 1st day of month 2 months prior (3 full calendar months total)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 2, 1, 0, 0, 0));
  }
  // 1Y: 1st day of month 11 months prior (12 full calendar months total)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 11, 1, 0, 0, 0));
}

export function initializeBuckets(
  timeframe: SpendingTimeframe,
  refDate: Date
): Map<string, AnalyticsBucketItem> {
  const buckets = new Map<string, AnalyticsBucketItem>();
  if (timeframe === "30D") {
    for (let i = 3; i >= 0; i--) {
      const weekKey = `W${4 - i}`;
      const weekLabel = `Week ${4 - i}`;
      buckets.set(weekKey, { key: weekKey, label: weekLabel, income: 0, outflow: 0 });
    }
    return buckets;
  }

  const monthCount = timeframe === "90D" ? 3 : 12;
  const curYear = refDate.getUTCFullYear();
  const curMonth = refDate.getUTCMonth();

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(curYear, curMonth - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
    buckets.set(monthKey, {
      key: monthKey,
      label: getMonthLabel(y, m),
      income: 0,
      outflow: 0,
    });
  }
  return buckets;
}

export function resolvePointKey(
  timeframe: SpendingTimeframe,
  recDate: Date,
  cutoffDate: Date
): string {
  if (timeframe !== "30D") {
    const y = recDate.getUTCFullYear();
    const m = recDate.getUTCMonth();
    return `${y}-${String(m + 1).padStart(2, "0")}`;
  }
  const diffDays = Math.floor((recDate.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24));
  const weekIndex = Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), 4);
  return `W${weekIndex}`;
}
