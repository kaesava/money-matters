import { DbOrTx, incomeSources, incomeEvents, expenseSources, expenseEvents } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { generateBurstDates } from "../engine/burst-engine.js";

import { getTenantDateString } from "@money-matters/core";

const getAestDateString = (d: Date = new Date()) => getTenantDateString(d);

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
  const todayStr = getAestDateString();

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
      .where(
        and(
          eq(incomeEvents.incomeSourceId, source.id),
          eq(incomeEvents.status, "UPCOMING"),
          sql`${incomeEvents.archivedAt} IS NULL`
        )
      );

    const existingDates = new Set(existingEvents.map((e) => e.expectedDate));
    const startDate = source.startDate || todayStr;
    const horizonDates = generateBurstDates(source.rrule, startDate, source.endDate, 12);

    const datesToInsert = horizonDates.filter((d) => {
      const dStr = getAestDateString(d);
      return dStr >= todayStr && !existingDates.has(dStr);
    });

    if (datesToInsert.length > 0) {
      await db.insert(incomeEvents).values(
        datesToInsert.map((d) => ({
          incomeSourceId: source.id,
          expectedDate: getAestDateString(d),
          expectedAmount: source.amount,
          status: "UPCOMING" as const,
          tenantId: tenantId,
          appId: appId,
          createdBy: userId,
          updatedBy: userId,
        }))
      );
      newEventsCount += datesToInsert.length;
    }
  }

  // 2. Sync Expense Sources
  const expenses = await db
    .select()
    .from(expenseSources)
    .where(
      and(
        eq(expenseSources.tenantId, tenantId),
        eq(expenseSources.appId, appId),
        sql`${expenseSources.archivedAt} IS NULL`
      )
    );

  for (const source of expenses) {
    if (!source.rrule) continue;

    const existingEvents = await db
      .select({ expectedDate: expenseEvents.expectedDate })
      .from(expenseEvents)
      .where(
        and(
          eq(expenseEvents.expenseSourceId, source.id),
          eq(expenseEvents.status, "UPCOMING"),
          sql`${expenseEvents.archivedAt} IS NULL`
        )
      );

    const existingDates = new Set(existingEvents.map((e) => e.expectedDate));
    const startDate = source.startDate || todayStr;
    const horizonDates = generateBurstDates(source.rrule, startDate, source.endDate, 12);

    const datesToInsert = horizonDates.filter((d) => {
      const dStr = getAestDateString(d);
      return dStr >= todayStr && !existingDates.has(dStr);
    });

    if (datesToInsert.length > 0) {
      await db.insert(expenseEvents).values(
        datesToInsert.map((d) => ({
          expenseSourceId: source.id,
          poolId: source.poolId,
          categoryId: source.categoryId,
          name: source.name,
          expectedDate: getAestDateString(d),
          expectedAmount: source.amount,
          status: "UPCOMING" as const,
          tenantId: tenantId,
          appId: appId,
          createdBy: userId,
          updatedBy: userId,
        }))
      );
      newEventsCount += datesToInsert.length;
    }
  }

  return { success: true, newEventsCount };
}
