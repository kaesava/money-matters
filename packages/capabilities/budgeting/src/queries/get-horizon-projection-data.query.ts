import { DEFAULT_TIMEZONE } from "@money-matters/types";
import {
  allocationPlans,
  allocationPlanLines,
  envelopes,
  incomeEvents,
  expenseEvents,
  incomeSources,
  bankAccounts,
  tenants,
  getEnvelopeBalancesMap,
  type DbOrTx,
} from "@money-matters/db";
import { getTenantDateString } from "@money-matters/core";
import { and, eq, sql, inArray } from "drizzle-orm";
import { computeMatrixProjection } from "../engine/horizon-projection-engine.js";
import { mapEnvelopeToEngineBucket } from "../engine/envelope-engine-mapper.js";

/**
 * Computes the 12-month payday matrix projection for a tenant, filtered by stealth privacy.
 */
export async function getHorizonProjectionDataQuery(
  tenantId: string,
  appId: string,
  userId: string,
  monthsAhead: number,
  db: DbOrTx
) {
  const rawEnvelopes = await db
    .select({
      envelope: envelopes,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(envelopes)
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), sql`${envelopes.archivedAt} IS NULL`));

  const activeEnvelopes = rawEnvelopes
    .filter((r) => !(r.envelope.isPrivate && r.envelope.userId !== userId) && !(r.bankAccountIsPrivate && r.bankAccountUserId !== userId))
    .map((r) => r.envelope);
  const visibleEnvelopeIds = new Set(activeEnvelopes.map((e) => e.id));

  const [tenantRecord] = await db.select({ timezone: tenants.timezone }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  const tenantTz = tenantRecord?.timezone || DEFAULT_TIMEZONE;
  const balancesMap = await getEnvelopeBalancesMap(tenantId, appId, db);

  const now = new Date();
  const futureDate = new Date();
  futureDate.setMonth(now.getMonth() + (monthsAhead || 12));
  const nowStr = getTenantDateString(now, { timezone: tenantTz });
  const futureStr = getTenantDateString(futureDate, { timezone: tenantTz });

  const rawIncomeEvents = await db
    .select({
      id: incomeEvents.id,
      expectedDate: incomeEvents.expectedDate,
      actualDate: incomeEvents.actualDate,
      expectedAmount: incomeEvents.expectedAmount,
      actualAmount: incomeEvents.actualAmount,
      status: incomeEvents.status,
      sourceName: sql<string>`COALESCE(${incomeEvents.name}, ${incomeSources.name}, 'Income')`,
      incomeSourceId: incomeEvents.incomeSourceId,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeSources.id, incomeEvents.incomeSourceId))
    .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
    .where(
      and(
        eq(incomeEvents.tenantId, tenantId),
        eq(incomeEvents.appId, appId),
        sql`${incomeEvents.archivedAt} IS NULL`,
        sql`${incomeEvents.expectedDate} >= ${nowStr}`,
        sql`${incomeEvents.expectedDate} <= ${futureStr}`
      )
    )
    .orderBy(incomeEvents.expectedDate);

  const dbIncomeEvents = rawIncomeEvents.filter((e) => !(e.bankAccountIsPrivate && e.bankAccountUserId !== userId));

  const rawExpenseEvents = await db
    .select({
      id: expenseEvents.id,
      envelopeId: expenseEvents.envelopeId,
      expectedDate: expenseEvents.expectedDate,
      actualDate: expenseEvents.actualDate,
      expectedAmount: expenseEvents.expectedAmount,
      actualAmount: expenseEvents.actualAmount,
      status: expenseEvents.status,
      name: expenseEvents.name,
    })
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        sql`${expenseEvents.archivedAt} IS NULL`,
        sql`${expenseEvents.expectedDate} >= ${nowStr}`,
        sql`${expenseEvents.expectedDate} <= ${futureStr}`
      )
    )
    .orderBy(expenseEvents.expectedDate);

  const dbExpenseEvents = rawExpenseEvents.filter((e) => e.envelopeId && visibleEnvelopeIds.has(e.envelopeId));
  const engineBuckets = activeEnvelopes.map((p) => mapEnvelopeToEngineBucket(p, balancesMap[p.id] || 0));

  const rawPlanRows = await db
    .select({
      id: allocationPlans.id,
      incomeEventId: allocationPlans.incomeEventId,
      status: allocationPlans.status,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(allocationPlans)
    .leftJoin(incomeEvents, eq(incomeEvents.id, allocationPlans.incomeEventId))
    .leftJoin(incomeSources, eq(incomeSources.id, incomeEvents.incomeSourceId))
    .leftJoin(bankAccounts, eq(bankAccounts.id, incomeSources.receivingAccountId))
    .where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId), sql`${allocationPlans.archivedAt} IS NULL`));

  const planRows = rawPlanRows.filter((p) => !(p.bankAccountIsPrivate && p.bankAccountUserId !== userId));
  const planIds = planRows.map((p) => p.id);
  const cellOverrides: Record<string, number> = {};

  if (planIds.length > 0) {
    const lineRows = await db
      .select({
        planId: allocationPlanLines.planId,
        envelopeId: allocationPlanLines.envelopeId,
        proposedAmount: allocationPlanLines.proposedAmount,
        confirmedAmount: allocationPlanLines.confirmedAmount,
      })
      .from(allocationPlanLines)
      .where(inArray(allocationPlanLines.planId, planIds));

    const planMap = new Map(planRows.map((p) => [p.id, p]));
    for (const line of lineRows) {
      if (!visibleEnvelopeIds.has(line.envelopeId)) continue;
      const plan = planMap.get(line.planId);
      if (plan) {
        cellOverrides[`${plan.incomeEventId}_${line.envelopeId}`] = parseFloat(line.confirmedAmount || line.proposedAmount || "0");
      }
    }
  }

  const projection = computeMatrixProjection({
    currentUserId: userId,
    categories: engineBuckets,
    incomeEvents: dbIncomeEvents.map((evt) => ({
      id: evt.id,
      expectedDate: evt.expectedDate,
      expectedAmount: parseFloat(evt.expectedAmount),
      actualAmount: evt.actualAmount ? parseFloat(evt.actualAmount) : null,
      status: evt.status as "PENDING" | "CONFIRMED",
      sourceName: evt.sourceName,
    })),
    expenseEvents: dbExpenseEvents
      .filter((evt): evt is typeof evt & { envelopeId: string } => Boolean(evt.envelopeId))
      .map((evt) => ({
        id: evt.id,
        envelopeId: evt.envelopeId,
        categoryId: evt.envelopeId,
        amount: parseFloat(evt.actualAmount || evt.expectedAmount),
        dueDate: evt.expectedDate,
        status: evt.status as "PENDING" | "CONFIRMED",
      })),
    cellOverrides,
    monthsAhead,
    timezone: tenantTz,
  });

  return { projection, rawIncomeEvents: dbIncomeEvents, rawExpenseEvents: dbExpenseEvents, envelopes: activeEnvelopes, pools: activeEnvelopes, categories: [] };
}
