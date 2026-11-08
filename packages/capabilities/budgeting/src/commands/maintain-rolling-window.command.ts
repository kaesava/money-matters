import { DbOrTx, incomeSources, envelopes, tenants } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { getTenantDateString } from "@money-matters/core";
import { burstEnvelopeEvents } from "./envelope-schedule.js";
import { burstIncomeEvents } from "./income-schedule.js";

export async function maintainRollingWindowCommand({
  db,
  tenantId,
  appId,
  userId,
}: {
  db: DbOrTx;
  tenantId: string;
  appId: string;
  userId: string;
}) {
  let incomeEventsCreated = 0;
  let expenseEventsCreated = 0;

  const [tenantRecord] = await db
    .select({ timezone: tenants.timezone })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  const tenantTz = tenantRecord?.timezone || "Australia/Sydney";
  const getLocalDateString = (d: Date = new Date()) => getTenantDateString(d, { timezone: tenantTz });
  const todayStr = getLocalDateString();

  const now = new Date();
  const horizonCutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 12, now.getUTCDate()));
  const horizonCutoffStr = getLocalDateString(horizonCutoff);

  // 1. Incrementally Burst Active Income Schedules
  // Pre-filter out ended schedules and schedules already burst up to horizon
  const incomes = await db
    .select()
    .from(incomeSources)
    .where(
      and(
        eq(incomeSources.tenantId, tenantId),
        eq(incomeSources.appId, appId),
        sql`${incomeSources.archivedAt} IS NULL`,
        sql`${incomeSources.rrule} IS NOT NULL`,
        sql`(${incomeSources.endDate} IS NULL OR ${incomeSources.endDate} >= ${todayStr})`,
        sql`(${incomeSources.endDate} IS NULL OR ${incomeSources.lastBurstDate} IS NULL OR ${incomeSources.lastBurstDate} < ${incomeSources.endDate})`,
        sql`(${incomeSources.lastBurstDate} IS NULL OR ${incomeSources.lastBurstDate} < ${horizonCutoffStr})`
      )
    );

  for (const source of incomes) {
    if (!source.rrule) continue;
    const startDate = source.startDate || todayStr;
    const count = await burstIncomeEvents(db, {
      incomeSourceId: source.id,
      name: source.name,
      amount: source.amount,
      rrule: source.rrule,
      startDate,
      endDate: source.endDate,
      contributionMode: source.contributionMode,
      contributionValue: source.contributionValue,
      tenantId,
      appId,
      userId,
      timeZone: tenantTz,
      afterDateStr: source.lastBurstDate,
    });
    incomeEventsCreated += count;
  }

  // 2. Incrementally Burst Active Scheduled Bill Envelopes (where generateEvents is true)
  // Pre-filter out ended schedules and schedules already burst up to horizon
  const billEnvelopes = await db
    .select()
    .from(envelopes)
    .where(
      and(
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        eq(envelopes.envelopeType, "SCHEDULED_BILL"),
        eq(envelopes.generateEvents, true),
        sql`${envelopes.archivedAt} IS NULL`,
        sql`${envelopes.rrule} IS NOT NULL`,
        sql`(${envelopes.endDate} IS NULL OR ${envelopes.endDate} >= ${todayStr})`,
        sql`(${envelopes.endDate} IS NULL OR ${envelopes.lastBurstDate} IS NULL OR ${envelopes.lastBurstDate} < ${envelopes.endDate})`,
        sql`(${envelopes.lastBurstDate} IS NULL OR ${envelopes.lastBurstDate} < ${horizonCutoffStr})`
      )
    );

  for (const env of billEnvelopes) {
    if (!env.rrule) continue;
    const amountVal = env.enteredAmount || env.monthlyAmount || "0.00";
    if (parseFloat(amountVal) <= 0) continue;

    const startDate = env.startDate || todayStr;
    const count = await burstEnvelopeEvents(db, {
      envelopeId: env.id,
      name: env.name,
      amount: amountVal,
      rrule: env.rrule,
      startDate,
      endDate: env.endDate,
      tenantId,
      appId,
      userId,
      timeZone: tenantTz,
      afterDateStr: env.lastBurstDate,
    });
    expenseEventsCreated += count;
  }

  return {
    success: true,
    newEventsCount: incomeEventsCreated + expenseEventsCreated,
    incomeEventsCreated,
    expenseEventsCreated,
  };
}
