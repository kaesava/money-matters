import {
  allocationPlans,
  allocationPlanLines,
  incomeEvents,
  incomeSources,
  bankAccounts,
  envelopes,
  DbOrTx,
} from "@money-matters/db";
import { eq, and, sql, gte, desc, inArray } from "drizzle-orm";
import {
  SpendingTimeframe,
  IncomeSplitAnalyticsDTO,
} from "@money-matters/types";
import { getAnalyticsCutoff } from "./income-split-analytics-buckets";
import { buildIncomeSplitAnalytics } from "./income-split-analytics-processors";
import { getTenantDateString } from "@money-matters/core";

export interface IncomeSplitAnalyticsFilterParams {
  timeframe: SpendingTimeframe;
  bankAccountId?: string;
  searchQuery?: string;
  envelopeId?: string;
}

export async function getIncomeSplitAnalyticsQuery(
  tenantId: string,
  appId: string,
  params: IncomeSplitAnalyticsFilterParams,
  dbClient: DbOrTx,
  referenceDate: Date = new Date()
): Promise<IncomeSplitAnalyticsDTO> {
  const { timeframe, bankAccountId, searchQuery, envelopeId } = params;
  const cutoffDate = getAnalyticsCutoff(timeframe, referenceDate);
  const cutoffDateStr = getTenantDateString(cutoffDate);

  const conditions = [
    eq(allocationPlans.tenantId, tenantId),
    eq(allocationPlans.appId, appId),
    sql`${allocationPlans.archivedAt} IS NULL`,
    gte(sql<string>`COALESCE(${incomeEvents.actualDate}, ${incomeEvents.expectedDate})`, cutoffDateStr),
  ];

  if (bankAccountId && bankAccountId !== "ALL") {
    conditions.push(eq(incomeSources.receivingAccountId, bankAccountId));
  }
  if (searchQuery && searchQuery.trim().length > 0) {
    const q = `%${searchQuery.trim()}%`;
    conditions.push(
      sql`(${incomeEvents.name} ILIKE ${q} OR ${incomeSources.name} ILIKE ${q} OR ${bankAccounts.name} ILIKE ${q})`
    );
  }

  const rawPlans = await dbClient
    .select({
      id: allocationPlans.id,
      totalIncomeAmount: allocationPlans.totalIncomeAmount,
      expectedDate: incomeEvents.expectedDate,
      actualDate: incomeEvents.actualDate,
      createdAt: allocationPlans.createdAt,
    })
    .from(allocationPlans)
    .leftJoin(incomeEvents, eq(incomeEvents.id, allocationPlans.incomeEventId))
    .leftJoin(incomeSources, eq(incomeSources.id, incomeEvents.incomeSourceId))
    .leftJoin(bankAccounts, eq(bankAccounts.id, incomeSources.receivingAccountId))
    .where(and(...conditions))
    .orderBy(desc(allocationPlans.createdAt));

  const allTenantEnvelopes = await dbClient
    .select({
      id: envelopes.id,
      name: envelopes.name,
      envelopeType: envelopes.envelopeType,
      isSurplusTarget: envelopes.isSurplusTarget,
    })
    .from(envelopes)
    .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), sql`${envelopes.archivedAt} IS NULL`));

  const defaultSweepEnvelope =
    allTenantEnvelopes.find((e) => e.isSurplusTarget) ||
    allTenantEnvelopes.find((e) => e.envelopeType === "EVERYDAY") ||
    allTenantEnvelopes[0];

  const planIds = rawPlans.map((p) => p.id);
  const rawLines = planIds.length > 0
    ? await dbClient
        .select({
          planId: allocationPlanLines.planId,
          envelopeId: allocationPlanLines.envelopeId,
          proposedAmount: allocationPlanLines.proposedAmount,
          confirmedAmount: allocationPlanLines.confirmedAmount,
          envelopeName: envelopes.name,
          envelopeType: envelopes.envelopeType,
        })
        .from(allocationPlanLines)
        .leftJoin(envelopes, eq(envelopes.id, allocationPlanLines.envelopeId))
        .where(inArray(allocationPlanLines.planId, planIds))
    : [];

  const isFiltered = Boolean(
    (bankAccountId && bankAccountId !== "ALL") ||
    (searchQuery && searchQuery.trim().length > 0) ||
    (envelopeId && envelopeId !== "ALL")
  );

  return buildIncomeSplitAnalytics({
    rawPlans,
    rawLines,
    defaultSweepId: defaultSweepEnvelope?.id ?? "",
    timeframe,
    cutoffDate,
    refDate: referenceDate,
    isFiltered,
    envelopeIdFilter: envelopeId && envelopeId !== "ALL" ? envelopeId : undefined,
  });
}
