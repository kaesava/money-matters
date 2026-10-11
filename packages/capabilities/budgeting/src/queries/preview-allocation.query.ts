import { envelopes, incomeEvents, incomeSources, expenseEvents, getEnvelopeBalancesMap, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { runAllocationEngine, EngineBucket } from "../engine/allocation-engine.js";
import { parseRruleFrequencyDays } from "../commands/run-allocation.command.js";
import { getTenantDateString } from "@money-matters/core";

export async function previewAllocationQuery(
  tenantId: string,
  appId: string,
  incomeEventId: string,
  incomeAmount: number,
  dbClient: DbOrTx,
  runwayDays?: number
) {
  // 1. Fetch Envelopes
  const dbEnvelopes = await dbClient
    .select()
    .from(envelopes)
    .where(
      and(
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        sql`${envelopes.archivedAt} IS NULL`
      )
    );

  // 2. Compute balances using DB-side aggregate SUM(CASE WHEN...)
  const balancesMap = await getEnvelopeBalancesMap(tenantId, appId, dbClient);

  // 3. Fetch income event joined with income source
  const [event] = await dbClient
    .select({
      id: incomeEvents.id,
      expectedDate: incomeEvents.expectedDate,
      rrule: incomeSources.rrule,
      incomeType: incomeSources.incomeType,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .where(eq(incomeEvents.id, incomeEventId));

  let freqDays = 14;
  if (event?.rrule) {
    freqDays = parseRruleFrequencyDays(event.rrule);
  }

  const todayStr = getTenantDateString(new Date(), { timezone: "Australia/Sydney" });
  const eventTime = event ? new Date(event.expectedDate + "T00:00:00").getTime() : Date.now();
  const nextCutoffDateStr = getTenantDateString(new Date(eventTime + freqDays * 24 * 60 * 60 * 1000), { timezone: "Australia/Sydney" });

  const pendingExpenses = await dbClient
    .select({
      id: expenseEvents.id,
      envelopeId: expenseEvents.envelopeId,
      name: expenseEvents.name,
      amount: expenseEvents.expectedAmount,
      dueDate: expenseEvents.expectedDate,
    })
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        eq(expenseEvents.status, "PENDING"),
        sql`${expenseEvents.expectedDate} <= ${nextCutoffDateStr}`,
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );

  const engineBuckets: EngineBucket[] = dbEnvelopes.map((env) => ({
    id: env.id,
    name: env.name,
    type: env.envelopeType,
    envelopeType: env.envelopeType,
    isEssential: env.isEssential,
    isCommitted: env.isCommitted,
    isSurplusTarget: env.isSurplusTarget,
    monthlyAmount: env.monthlyAmount ? parseFloat(env.monthlyAmount) : null,
    targetAmount: env.targetAmount ? parseFloat(env.targetAmount) : null,
    safetyBufferFloor: env.safetyBufferFloor ? parseFloat(env.safetyBufferFloor) : 0,
    goalMode: env.goalMode ?? (env.envelopeType === "TARGET_GOAL" ? "TARGET_DATE" : "ONGOING"),
    targetDate: env.endDate || null,
    currentBalance: balancesMap[env.id] || 0,
    isPrivate: env.isPrivate,
    userId: env.userId ?? undefined,
  }));

  const output = runAllocationEngine({
    incomeAmount,
    incomeType: event?.incomeType || "SALARIED",
    runwayDays: runwayDays ?? 30,
    buckets: engineBuckets,
    paycheckDate: event ? new Date(event.expectedDate + "T00:00:00+10:00") : new Date(),
    paycheckFrequencyDays: freqDays,
    upcomingExpenses: pendingExpenses.map((e) => ({
      envelopeId: e.envelopeId,
      name: e.name,
      amount: parseFloat(e.amount),
      dueDate: e.dueDate,
    })),
  });

  return output;
}
