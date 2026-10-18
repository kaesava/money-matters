import { transactionLedger, envelopes, DbOrTx } from "@money-matters/db";
import { eq, and, sql, gte, desc, notInArray, ilike } from "drizzle-orm";
import {
  SpendingTimeframe,
  SpendingFlowType,
  SpendingAnalyticsDTO,
  TopOutflowPoolDTO,
  MonthlyCashFlowPointDTO,
} from "@money-matters/types";
import {
  getAnalyticsCutoff,
  initializeBuckets,
  resolvePointKey,
  extractTopPayees,
} from "./spending-analytics-buckets";

export interface AnalyticsFilterParams {
  timeframe: SpendingTimeframe;
  envelopeId?: string;
  bankAccountId?: string;
  searchQuery?: string;
  flowType?: SpendingFlowType;
}

const EXCLUDED_TYPES: (typeof transactionLedger.transactionType.enumValues)[number][] = [
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "ACCOUNT_ALIGNMENT",
  "BALANCE_ADJUSTMENT",
  "OPENING_BALANCE",
];

export async function getSpendingAnalyticsQuery(
  tenantId: string,
  appId: string,
  params: AnalyticsFilterParams,
  dbClient: DbOrTx,
  referenceDate: Date = new Date()
): Promise<SpendingAnalyticsDTO> {
  const { timeframe, flowType = "ALL", envelopeId, bankAccountId, searchQuery } = params;

  if (flowType === "TRANSFER") {
    return createEmptyTransferAnalytics(timeframe);
  }

  const cutoffDate = getAnalyticsCutoff(timeframe, referenceDate);
  const conditions = [
    eq(transactionLedger.tenantId, tenantId),
    eq(transactionLedger.appId, appId),
    sql`${transactionLedger.archivedAt} IS NULL`,
    gte(transactionLedger.recordedAt, cutoffDate),
    notInArray(transactionLedger.transactionType, EXCLUDED_TYPES),
  ];

  if (envelopeId && envelopeId !== "ALL") {
    conditions.push(eq(transactionLedger.envelopeId, envelopeId));
  }
  if (bankAccountId && bankAccountId !== "ALL") {
    conditions.push(eq(transactionLedger.bankAccountId, bankAccountId));
  }
  if (flowType === "DEBIT" || flowType === "CREDIT") {
    conditions.push(eq(transactionLedger.flowType, flowType));
  }
  if (searchQuery && searchQuery.trim().length > 0) {
    conditions.push(ilike(transactionLedger.note, `%${searchQuery.trim()}%`));
  }

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
      note: transactionLedger.note,
    })
    .from(transactionLedger)
    .leftJoin(envelopes, eq(transactionLedger.envelopeId, envelopes.id))
    .where(and(...conditions))
    .orderBy(desc(transactionLedger.recordedAt));

  const isFiltered = Boolean(
    (envelopeId && envelopeId !== "ALL") ||
    (bankAccountId && bankAccountId !== "ALL") ||
    (searchQuery && searchQuery.trim().length > 0) ||
    flowType !== "ALL"
  );

  return processSpendingAnalyticsRows(rows, timeframe, referenceDate, cutoffDate, isFiltered);
}

function createEmptyTransferAnalytics(timeframe: SpendingTimeframe): SpendingAnalyticsDTO {
  return {
    timeframe,
    totalOutflow: 0,
    totalIncome: 0,
    horizonBreakdown: {
      everyday: 0,
      bills: 0,
      goals: 0,
      totalOutflow: 0,
      percentages: { everyday: 0, bills: 0, goals: 0 },
    },
    monthlyCashFlow: [],
    topPools: [],
    otherPoolsAmount: 0,
    isEmpty: true,
    isFiltered: true,
    isTransferOnly: true,
    filteredSharePercentage: 0,
    topPayees: [],
  };
}

export interface RawAnalyticsRow {
  id: string;
  amount: string;
  flowType: "DEBIT" | "CREDIT";
  transactionType: string;
  recordedAt: Date;
  envelopeId: string;
  envelopeName: string | null;
  envelopeType: "EVERYDAY" | "SCHEDULED_BILL" | "FLEXIBLE_BILL" | "TARGET_GOAL" | "ONGOING_GOAL" | null;
  note?: string | null;
}

export function processSpendingAnalyticsRows(
  rows: RawAnalyticsRow[],
  timeframe: SpendingTimeframe,
  refDate: Date = new Date(),
  cutoffDate: Date = getAnalyticsCutoff(timeframe, refDate),
  isFiltered = false
): SpendingAnalyticsDTO {
  let totalOutflow = 0;
  let totalIncome = 0;
  let everydayOutflow = 0;
  let billsOutflow = 0;
  let goalsOutflow = 0;

  const envOutflowMap = new Map<string, { id: string; name: string; amount: number }>();
  const buckets = initializeBuckets(timeframe, refDate);

  for (const r of rows) {
    const amt = parseFloat(r.amount) || 0;
    const pKey = resolvePointKey(timeframe, new Date(r.recordedAt), cutoffDate);
    const bucket = buckets.get(pKey);

    if (r.flowType === "CREDIT") {
      totalIncome += amt;
      if (bucket) bucket.income += amt;
    } else if (r.flowType === "DEBIT") {
      totalOutflow += amt;
      if (bucket) bucket.outflow += amt;

      const envType = r.envelopeType;
      if (envType === "EVERYDAY") everydayOutflow += amt;
      else if (envType === "SCHEDULED_BILL" || envType === "FLEXIBLE_BILL") billsOutflow += amt;
      else if (envType === "TARGET_GOAL" || envType === "ONGOING_GOAL") goalsOutflow += amt;
      else everydayOutflow += amt;

      const envId = r.envelopeId;
      const envName = r.envelopeName || "Unassigned Envelope";
      const existing = envOutflowMap.get(envId) || { id: envId, name: envName, amount: 0 };
      existing.amount += amt;
      envOutflowMap.set(envId, existing);
    }
  }

  const monthlyCashFlow: MonthlyCashFlowPointDTO[] = Array.from(buckets.values()).map((b) => ({
    monthKey: b.key,
    label: b.label,
    income: Math.round(b.income * 100) / 100,
    outflow: Math.round(b.outflow * 100) / 100,
    net: Math.round((b.income - b.outflow) * 100) / 100,
  }));

  const sortedEnvs = Array.from(envOutflowMap.values()).sort((a, b) => b.amount - a.amount);
  const topPools: TopOutflowPoolDTO[] = sortedEnvs.slice(0, 5).map((e) => ({
    id: e.id,
    name: e.name,
    amount: Math.round(e.amount * 100) / 100,
    percentage: totalOutflow > 0 ? Math.round((e.amount / totalOutflow) * 10000) / 100 : 0,
  }));

  const topPayees = isFiltered ? extractTopPayees(rows, totalOutflow) : [];
  const filteredEnvName = isFiltered && sortedEnvs.length === 1 ? sortedEnvs[0].name : undefined;

  return {
    timeframe,
    totalOutflow: Math.round(totalOutflow * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    horizonBreakdown: {
      everyday: Math.round(everydayOutflow * 100) / 100,
      bills: Math.round(billsOutflow * 100) / 100,
      goals: Math.round(goalsOutflow * 100) / 100,
      totalOutflow: Math.round(totalOutflow * 100) / 100,
      percentages: {
        everyday: totalOutflow > 0 ? Math.round((everydayOutflow / totalOutflow) * 10000) / 100 : 0,
        bills: totalOutflow > 0 ? Math.round((billsOutflow / totalOutflow) * 10000) / 100 : 0,
        goals: totalOutflow > 0 ? Math.round((goalsOutflow / totalOutflow) * 10000) / 100 : 0,
      },
    },
    monthlyCashFlow,
    topPools,
    otherPoolsAmount: Math.round(sortedEnvs.slice(5).reduce((s, e) => s + e.amount, 0) * 100) / 100,
    isEmpty: rows.length === 0 || totalOutflow === 0,
    isFiltered,
    filteredEnvelopeName: filteredEnvName,
    filteredSharePercentage: totalOutflow > 0 ? 100 : 0,
    topPayees,
    isTransferOnly: false,
  };
}
