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
  let newEventsCount = 0;

  const [tenantRecord] = typeof (db as any).select === "function"
    ? await db
        .select({ timezone: tenants.timezone })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1)
    : [null];
  const tenantTz = tenantRecord?.timezone || "Australia/Sydney";
  const getLocalDateString = (d: Date = new Date()) => getTenantDateString(d, { timezone: tenantTz });
  const todayStr = getLocalDateString();

  // 1. Sync Income Sources
  const incomes = await db
    .select()
    .from(incomeSources)
    .where(
      and(
        eq(incomeSources.tenantId, tenantId),
        eq(incomeSources.appId, appId),
        sql`${incomeSources.archivedAt} IS NULL`
      )
    );

  for (const source of incomes) {
    if (!source.rrule) continue;

    const existingEvents = await db
      .select({ expectedDate: incomeEvents.expectedDate })
      .from(incomeEvents)
      .where(eq(incomeEvents.incomeSourceId, source.id));

    const existingDates = new Set(existingEvents.map((e) => e.expectedDate));
    const startDate = source.startDate || todayStr;
    const horizonDates = generateBurstDates(source.rrule, startDate, source.endDate, 12);

    const datesToInsert = horizonDates.filter((d) => {
      const dStr = getLocalDateString(d);
      return !existingDates.has(dStr);
    });

    if (datesToInsert.length > 0) {
      await db.insert(incomeEvents).values(
        datesToInsert.map((d) => {
          const dateStr = getLocalDateString(d);
          return {
            incomeSourceId: source.id,
            name: source.name,
            expectedDate: dateStr,
            actualDate: dateStr,
            expectedAmount: source.amount,
            actualAmount: source.amount,
            status: "PENDING" as const,
            tenantId,
            appId,
            createdBy: userId,
            updatedBy: userId,
          };
        })
      );
      newEventsCount += datesToInsert.length;
    }
  }

  // 2. Sync Scheduled Bill Envelopes
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

    const existingEvents = await db
      .select({ expectedDate: expenseEvents.expectedDate })
      .from(expenseEvents)
      .where(
        and(
          eq(expenseEvents.envelopeId, env.id),
          eq(expenseEvents.tenantId, tenantId),
          eq(expenseEvents.appId, appId)
        )
      );

    const existingDates = new Set(existingEvents.map((e) => e.expectedDate));
    const startDate = env.startDate || todayStr;
    const horizonDates = generateBurstDates(env.rrule, startDate, env.endDate, 12);

    const datesToInsert = horizonDates.filter((d) => {
      const dStr = getLocalDateString(d);
      return !existingDates.has(dStr);
    });

    if (datesToInsert.length > 0) {
      await db.insert(expenseEvents).values(
        datesToInsert.map((d) => {
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
        })
      );
      newEventsCount += datesToInsert.length;
    }
  }

  return { success: true, newEventsCount };
}
