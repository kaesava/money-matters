import {
  allocationPlans,
  allocationPlanLines,
  envelopes,
  incomeEvents,
  incomeSources,
  bankAccounts,
  type DbOrTx,
} from "@money-matters/db";
import { and, eq, sql, desc, inArray } from "drizzle-orm";

/**
 * Fetches the latest allocation plan and stealth-filtered lines for a single income event.
 */
export async function listAllocationPlanQuery(
  incomeEventId: string,
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  const [planRow] = await db
    .select({
      plan: allocationPlans,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(allocationPlans)
    .leftJoin(incomeEvents, eq(incomeEvents.id, allocationPlans.incomeEventId))
    .leftJoin(incomeSources, eq(incomeSources.id, incomeEvents.incomeSourceId))
    .leftJoin(bankAccounts, eq(bankAccounts.id, incomeSources.receivingAccountId))
    .where(and(eq(allocationPlans.incomeEventId, incomeEventId), eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId), sql`${allocationPlans.archivedAt} IS NULL`))
    .orderBy(desc(allocationPlans.createdAt))
    .limit(1);

  if (!planRow || (planRow.bankAccountIsPrivate && planRow.bankAccountUserId !== userId)) {
    return null;
  }

  const lines = await db
    .select({
      id: allocationPlanLines.id,
      envelopeId: allocationPlanLines.envelopeId,
      poolId: allocationPlanLines.envelopeId,
      proposedAmount: allocationPlanLines.proposedAmount,
      confirmedAmount: allocationPlanLines.confirmedAmount,
      reasoning: allocationPlanLines.reasoning,
      envelopeName: envelopes.name,
      poolName: envelopes.name,
      envelopeIsPrivate: envelopes.isPrivate,
      envelopeUserId: envelopes.userId,
    })
    .from(allocationPlanLines)
    .leftJoin(envelopes, eq(envelopes.id, allocationPlanLines.envelopeId))
    .where(eq(allocationPlanLines.planId, planRow.plan.id));

  const visibleLines = lines.filter((l) => !(l.envelopeIsPrivate && l.envelopeUserId !== userId));
  return {
    ...planRow.plan,
    lines: visibleLines.map((l) => ({ ...l, envelopeName: l.envelopeName ?? "Unknown Envelope", poolName: l.poolName ?? "Unknown Envelope" })),
  };
}

/**
 * Fetches the 50 most recent allocation plans and stealth-filtered lines for a tenant.
 */
export async function listAllAllocationPlansQuery(tenantId: string, appId: string, userId: string, db: DbOrTx) {
  const rawPlans = await db
    .select({
      id: allocationPlans.id,
      tenantId: allocationPlans.tenantId,
      appId: allocationPlans.appId,
      incomeEventId: allocationPlans.incomeEventId,
      totalIncomeAmount: allocationPlans.totalIncomeAmount,
      status: allocationPlans.status,
      createdAt: allocationPlans.createdAt,
      updatedAt: allocationPlans.updatedAt,
      incomeName: sql<string>`COALESCE(${incomeEvents.name}, ${incomeSources.name}, 'Income Deposit')`,
      receivingAccountName: bankAccounts.name,
      receivingAccountId: bankAccounts.id,
      expectedDate: sql<string>`COALESCE(${incomeEvents.expectedDate}::text, ${incomeEvents.actualDate}::text, TO_CHAR(${allocationPlans.createdAt}, 'YYYY-MM-DD'))`,
      actualDate: incomeEvents.actualDate,
      note: incomeEvents.note,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(allocationPlans)
    .leftJoin(incomeEvents, eq(incomeEvents.id, allocationPlans.incomeEventId))
    .leftJoin(incomeSources, eq(incomeSources.id, incomeEvents.incomeSourceId))
    .leftJoin(bankAccounts, eq(bankAccounts.id, incomeSources.receivingAccountId))
    .where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId), sql`${allocationPlans.archivedAt} IS NULL`))
    .orderBy(desc(allocationPlans.createdAt))
    .limit(50);

  const plans = rawPlans.filter((p) => !(p.bankAccountIsPrivate && p.bankAccountUserId !== userId));
  const planIds = plans.map((p) => p.id);
  const lines = planIds.length > 0
    ? await db
        .select({
          planId: allocationPlanLines.planId,
          envelopeId: allocationPlanLines.envelopeId,
          proposedAmount: allocationPlanLines.proposedAmount,
          confirmedAmount: allocationPlanLines.confirmedAmount,
          reasoning: allocationPlanLines.reasoning,
          envelopeName: envelopes.name,
          envelopeIsPrivate: envelopes.isPrivate,
          envelopeUserId: envelopes.userId,
        })
        .from(allocationPlanLines)
        .leftJoin(envelopes, eq(envelopes.id, allocationPlanLines.envelopeId))
        .where(inArray(allocationPlanLines.planId, planIds))
    : [];

  const visibleLines = lines.filter((l) => !(l.envelopeIsPrivate && l.envelopeUserId !== userId));
  return plans.map((plan) => ({
    ...plan,
    lines: visibleLines
      .filter((l) => l.planId === plan.id)
      .map((l) => ({ ...l, poolId: l.envelopeId, poolName: l.envelopeName ?? "Unknown Envelope" })),
  }));
}
