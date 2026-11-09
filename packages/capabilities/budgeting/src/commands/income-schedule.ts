import { incomeEvents, incomeSources, DbOrTx } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { generateBurstDates } from "../engine/burst-engine.js";

export async function burstIncomeEvents(
  tx: DbOrTx,
  params: {
    incomeSourceId: string;
    name: string;
    amount: string;
    rrule: string;
    startDate: string;
    endDate?: string | null;
    contributionMode?: "FULL" | "PERCENTAGE" | "FIXED_AMOUNT" | null;
    contributionValue?: string | null;
    tenantId: string;
    appId: string;
    userId: string;
    timeZone?: string;
    afterDateStr?: string | null;
  }
): Promise<number> {
  const dates = generateBurstDates(
    params.rrule,
    params.startDate,
    params.endDate,
    12,
    1000,
    params.afterDateStr
  );
  if (dates.length === 0) return 0;
  const tz = params.timeZone || "Australia/Sydney";

  const eventsToInsert = dates.map((d) => {
    const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
    return {
      tenantId: params.tenantId,
      appId: params.appId,
      incomeSourceId: params.incomeSourceId,
      name: params.name,
      expectedDate: dateStr,
      actualDate: dateStr,
      expectedAmount: params.amount,
      actualAmount: params.amount,
      contributionMode: params.contributionMode || ("FULL" as const),
      contributionValue: params.contributionValue || null,
      status: "PENDING" as const,
      createdBy: params.userId,
      updatedBy: params.userId,
    };
  });

  const insertQuery = tx.insert(incomeEvents).values(eventsToInsert);
  if ("onConflictDoNothing" in insertQuery && typeof (insertQuery as { onConflictDoNothing?: unknown }).onConflictDoNothing === "function") {
    await (insertQuery as { onConflictDoNothing: () => Promise<unknown> }).onConflictDoNothing();
  } else {
    await insertQuery;
  }

  const lastDate = eventsToInsert[eventsToInsert.length - 1].expectedDate;
  await tx
    .update(incomeSources)
    .set({
      lastBurstDate: lastDate,
      updatedAt: new Date(),
      updatedBy: params.userId,
    })
    .where(eq(incomeSources.id, params.incomeSourceId));

  return eventsToInsert.length;
}

export async function clearPendingIncomeEvents(
  tx: DbOrTx,
  incomeSourceId: string,
  tenantId: string,
  appId: string,
  userId?: string
): Promise<void> {
  const now = new Date();
  await tx
    .update(incomeEvents)
    .set({
      archivedAt: now,
      archivedBy: userId || null,
      updatedAt: now,
      ...(userId ? { updatedBy: userId } : {}),
    })
    .where(
      and(
        eq(incomeEvents.incomeSourceId, incomeSourceId),
        eq(incomeEvents.status, "PENDING"),
        eq(incomeEvents.tenantId, tenantId),
        eq(incomeEvents.appId, appId),
        sql`${incomeEvents.archivedAt} IS NULL`
      )
    );
}
