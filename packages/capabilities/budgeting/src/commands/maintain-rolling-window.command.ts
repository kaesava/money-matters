import { DbOrTx, incomeSources, incomeEvents, envelopes, expenseEvents, tenants } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { generateBurstDates } from "../engine/burst-engine.js";
import { getTenantDateString } from "@money-matters/core";

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

  // 1. Incrementally Burst Active Income Schedules
  const incomes = await db
    .select()
    .from(incomeSources)
    .where(
      and(
        eq(incomeSources.tenantId, tenantId),
        eq(incomeSources.appId, appId),
        sql`${incomeSources.archivedAt} IS NULL`,
        sql`${incomeSources.rrule} IS NOT NULL`
      )
    );

  for (const source of incomes) {
    if (!source.rrule) continue;
    const startDate = source.startDate || todayStr;
    const dates = generateBurstDates(
      source.rrule,
      startDate,
      source.endDate,
      12,
      1000,
      source.lastBurstDate
    );

    if (dates.length > 0) {
      const eventsToInsert = dates.map((d) => {
        const dateStr = getLocalDateString(d);
        return {
          incomeSourceId: source.id,
          name: source.name,
          expectedDate: dateStr,
          actualDate: dateStr,
          expectedAmount: source.amount,
          actualAmount: source.amount,
          contributionMode: source.contributionMode || ("FULL" as const),
          contributionValue: source.contributionValue || null,
          status: "PENDING" as const,
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        };
      });

      await db.insert(incomeEvents).values(eventsToInsert);

      const maxDate = eventsToInsert[eventsToInsert.length - 1].expectedDate;
      await db
        .update(incomeSources)
        .set({
          lastBurstDate: maxDate,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(incomeSources.id, source.id));

      incomeEventsCreated += eventsToInsert.length;
    }
  }

  // 2. Incrementally Burst Active Scheduled Bill Envelopes (where generateEvents is true)
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
        sql`${envelopes.rrule} IS NOT NULL`
      )
    );

  for (const env of billEnvelopes) {
    if (!env.rrule) continue;
    const amountVal = env.enteredAmount || env.monthlyAmount || "0.00";
    if (parseFloat(amountVal) <= 0) continue;

    const startDate = env.startDate || todayStr;
    const dates = generateBurstDates(
      env.rrule,
      startDate,
      env.endDate,
      12,
      1000,
      env.lastBurstDate
    );

    if (dates.length > 0) {
      const eventsToInsert = dates.map((d) => {
        const dateStr = getLocalDateString(d);
        return {
          envelopeId: env.id,
          name: env.name,
          expectedDate: dateStr,
          expectedAmount: amountVal,
          isScheduled: true,
          status: "PENDING" as const,
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        };
      });

      await db.insert(expenseEvents).values(eventsToInsert);

      const maxDate = eventsToInsert[eventsToInsert.length - 1].expectedDate;
      await db
        .update(envelopes)
        .set({
          lastBurstDate: maxDate,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(envelopes.id, env.id));

      expenseEventsCreated += eventsToInsert.length;
    }
  }

  return {
    success: true,
    newEventsCount: incomeEventsCreated + expenseEventsCreated,
    incomeEventsCreated,
    expenseEventsCreated,
  };
}
