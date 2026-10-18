import { transactionLedger, envelopes, DbOrTx } from "@money-matters/db";
import { eq, and, sql, gte, desc, notInArray } from "drizzle-orm";
import {
  SpendingTimeframe,
  SpendingAnalyticsDTO,
  TopOutflowPoolDTO,
  MonthlyCashFlowPointDTO,
} from "@money-matters/types";

function getCutoffDate(timeframe: SpendingTimeframe, referenceDate: Date): Date {
  const d = new Date(referenceDate);
  if (timeframe === "30D") {
    d.setDate(d.getDate() - 30);
  } else if (timeframe === "90D") {
    d.setDate(d.getDate() - 90);
  } else {
    d.setFullYear(d.getFullYear() - 1);
  }
  return d;
}

function getMonthLabel(year: number, monthZeroIndex: number): string {
  const date = new Date(Date.UTC(year, monthZeroIndex, 1));
  return new Intl.DateTimeFormat("en-AU", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export async function getSpendingAnalyticsQuery(
  tenantId: string,
  appId: string,
  timeframe: SpendingTimeframe,
  dbClient: DbOrTx,
  referenceDate: Date = new Date()
): Promise<SpendingAnalyticsDTO> {
  const cutoffDate = getCutoffDate(timeframe, referenceDate);

  const excludedTypes: (typeof transactionLedger.transactionType.enumValues)[number][] = [
    "TRANSFER_OUT",
    "TRANSFER_IN",
    "ACCOUNT_ALIGNMENT",
    "BALANCE_ADJUSTMENT",
    "OPENING_BALANCE",
  ];

  const rows = await dbClient
    .select({
      id: transactionLedger.id,
      amount: transactionLedger.amount,
      flowType: transactionLedger.flowType,
      transactionType: transactionLedger.transactionType,
      recordedAt: transactionLedger.recordedAt,
      envelopeId: transactionLedger.envelopeId,
      envelopeName: envelopes.name,
      envelopeType: envelopes.envelopeType,
    })
    .from(transactionLedger)
    .leftJoin(envelopes, eq(transactionLedger.envelopeId, envelopes.id))
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        sql`${transactionLedger.archivedAt} IS NULL`,
        gte(transactionLedger.recordedAt, cutoffDate),
        notInArray(transactionLedger.transactionType, excludedTypes)
      )
    )
    .orderBy(desc(transactionLedger.recordedAt));

  return processSpendingAnalyticsRows(rows, timeframe);
}

interface RawAnalyticsRow {
  id: string;
  amount: string;
  flowType: "DEBIT" | "CREDIT";
  transactionType: string;
  recordedAt: Date;
  envelopeId: string;
  envelopeName: string | null;
  envelopeType: "EVERYDAY" | "SCHEDULED_BILL" | "FLEXIBLE_BILL" | "TARGET_GOAL" | "ONGOING_GOAL" | null;
}

export function processSpendingAnalyticsRows(
  rows: RawAnalyticsRow[],
  timeframe: SpendingTimeframe
): SpendingAnalyticsDTO {
  let totalOutflow = 0;
  let totalIncome = 0;
  let everydayOutflow = 0;
  let billsOutflow = 0;
  let goalsOutflow = 0;

  const envelopeOutflowMap = new Map<string, { id: string; name: string; amount: number }>();
  const monthMap = new Map<string, { monthKey: string; label: string; income: number; outflow: number }>();

  for (const r of rows) {
    const amt = parseFloat(r.amount) || 0;
    const recDate = new Date(r.recordedAt);
    const year = recDate.getUTCFullYear();
    const month = recDate.getUTCMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        monthKey,
        label: getMonthLabel(year, month),
        income: 0,
        outflow: 0,
      });
    }

    const monthEntry = monthMap.get(monthKey)!;

    if (r.flowType === "CREDIT") {
      totalIncome += amt;
      monthEntry.income += amt;
    } else if (r.flowType === "DEBIT") {
      totalOutflow += amt;
      monthEntry.outflow += amt;

      const envType = r.envelopeType;
      if (envType === "EVERYDAY") {
        everydayOutflow += amt;
      } else if (envType === "SCHEDULED_BILL" || envType === "FLEXIBLE_BILL") {
        billsOutflow += amt;
      } else if (envType === "TARGET_GOAL" || envType === "ONGOING_GOAL") {
        goalsOutflow += amt;
      } else {
        everydayOutflow += amt;
      }

      const envId = r.envelopeId;
      const envName = r.envelopeName || "Unassigned Envelope";
      const existingEnv = envelopeOutflowMap.get(envId) || { id: envId, name: envName, amount: 0 };
      existingEnv.amount += amt;
      envelopeOutflowMap.set(envId, existingEnv);
    }
  }

  const percentages = {
    everyday: totalOutflow > 0 ? Math.round((everydayOutflow / totalOutflow) * 10000) / 100 : 0,
    bills: totalOutflow > 0 ? Math.round((billsOutflow / totalOutflow) * 10000) / 100 : 0,
    goals: totalOutflow > 0 ? Math.round((goalsOutflow / totalOutflow) * 10000) / 100 : 0,
  };

  const monthlyCashFlow: MonthlyCashFlowPointDTO[] = Array.from(monthMap.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((m) => ({
      monthKey: m.monthKey,
      label: m.label,
      income: Math.round(m.income * 100) / 100,
      outflow: Math.round(m.outflow * 100) / 100,
      net: Math.round((m.income - m.outflow) * 100) / 100,
    }));

  const sortedEnvelopes = Array.from(envelopeOutflowMap.values()).sort(
    (a, b) => b.amount - a.amount
  );

  const top5 = sortedEnvelopes.slice(0, 5);
  const remaining = sortedEnvelopes.slice(5);
  const otherPoolsAmount = remaining.reduce((sum, e) => sum + e.amount, 0);

  const topPools: TopOutflowPoolDTO[] = top5.map((e) => ({
    id: e.id,
    name: e.name,
    amount: Math.round(e.amount * 100) / 100,
    percentage: totalOutflow > 0 ? Math.round((e.amount / totalOutflow) * 10000) / 100 : 0,
  }));

  return {
    timeframe,
    totalOutflow: Math.round(totalOutflow * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    horizonBreakdown: {
      everyday: Math.round(everydayOutflow * 100) / 100,
      bills: Math.round(billsOutflow * 100) / 100,
      goals: Math.round(goalsOutflow * 100) / 100,
      totalOutflow: Math.round(totalOutflow * 100) / 100,
      percentages,
    },
    monthlyCashFlow,
    topPools,
    otherPoolsAmount: Math.round(otherPoolsAmount * 100) / 100,
    isEmpty: rows.length === 0 || totalOutflow === 0,
  };
}
