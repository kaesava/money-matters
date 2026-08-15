import { DbOrTx, categories, categorySchedules, allocationPlans, allocationPlanLines, transactionLedger, incomeEvents, incomeSources } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { runAllocationEngine, EngineBucket } from "../engine/allocation-engine.js";

/**
 * Resolves frequency interval in days from an RRULE recurrence string.
 * Supports WEEKLY (7d), FORTNIGHTLY (14d), MONTHLY (30d), and ANNUALLY / YEARLY (365d).
 *
 * @param rrule - Recurrence rule string (e.g. 'FREQ=WEEKLY;INTERVAL=2' or 'FREQ=MONTHLY')
 * @returns Frequency duration in calendar days (defaults to 14 if undefined/unmatched)
 */
export function parseRruleFrequencyDays(rrule?: string | null): number {
  if (!rrule) return 14;
  const upper = rrule.toUpperCase();
  if (upper.includes("FORTNIGHTLY") || (upper.includes("FREQ=WEEKLY") && upper.includes("INTERVAL=2"))) {
    return 14;
  }
  if (upper.includes("FREQ=WEEKLY") || upper.includes("WEEKLY")) {
    return 7;
  }
  if (upper.includes("FREQ=MONTHLY") || upper.includes("MONTHLY")) {
    return 30;
  }
  if (upper.includes("FREQ=YEARLY") || upper.includes("ANNUALLY") || upper.includes("YEARLY")) {
    return 365;
  }
  return 14;
}

export async function runAllocationCommand(
  tenantId: string,
  appId: string,
  userId: string,
  incomeEventId: string,
  incomeAmount: number,
  dbClient: DbOrTx,
  customLines?: { bucketId: string; amount: string }[],
  markAsReceivedToday?: boolean
) {
  // 1. Fetch Categories
  const dbCats = await dbClient
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.tenantId, tenantId),
        eq(categories.appId, appId),
        sql`${categories.archivedAt} IS NULL`
      )
    );

  // 2. Fetch Category Schedules
  const dbSchedules = await dbClient
    .select()
    .from(categorySchedules)
    .where(
      and(
        eq(categorySchedules.tenantId, tenantId),
        eq(categorySchedules.appId, appId),
        sql`${categorySchedules.archivedAt} IS NULL`
      )
    );

  const schedulesMap = new Map(dbSchedules.map((s) => [s.categoryId, s]));

  // 3. Compute balances from ledger credits and debits
  const txs = await dbClient
    .select({
      categoryId: transactionLedger.categoryId,
      amount: transactionLedger.amount,
      flowType: transactionLedger.flowType,
    })
    .from(transactionLedger)
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        sql`${transactionLedger.archivedAt} IS NULL`
      )
    );

  const balancesMap: Record<string, number> = {};
  for (const cat of dbCats) {
    balancesMap[cat.id] = 0;
  }
  for (const tx of txs) {
    const val = parseFloat(tx.amount);
    if (tx.flowType === "CREDIT") {
      balancesMap[tx.categoryId] = (balancesMap[tx.categoryId] || 0) + val;
    } else {
      balancesMap[tx.categoryId] = (balancesMap[tx.categoryId] || 0) - val;
    }
  }

  // 4. Fetch income event to resolve dates & recurrence frequency
  const [event] = await dbClient
    .select()
    .from(incomeEvents)
    .where(eq(incomeEvents.id, incomeEventId));

  let freqDays = 14;
  if (event) {
    const [source] = await dbClient
      .select()
      .from(incomeSources)
      .where(eq(incomeSources.id, event.incomeSourceId));
    if (source?.rrule) {
      freqDays = parseRruleFrequencyDays(source.rrule);
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const eventDateStr = event ? new Date(event.expectedDate).toISOString().slice(0, 10) : todayStr;
  const isFuturePlanned = eventDateStr > todayStr && !markAsReceivedToday;

  // Map to engine models
  const engineBuckets: EngineBucket[] = dbCats.map((cat) => {
    const sched = schedulesMap.get(cat.id);
    const balance = balancesMap[cat.id] || 0;
    return {
      id: cat.id,
      name: cat.name,
      type: cat.type,
      isCommitted: cat.isCommitted,
      monthlyAmount: cat.monthlyAmount ? parseFloat(cat.monthlyAmount) : null,
      targetAmount: sched?.targetAmount ? parseFloat(sched.targetAmount) : null,
      targetDate: sched?.targetDate || null,
      currentBalance: balance,
    };
  });

  const engineOutput = runAllocationEngine({
    incomeAmount,
    buckets: engineBuckets,
    paycheckDate: event ? new Date(event.expectedDate) : new Date(),
    paycheckFrequencyDays: freqDays,
  });

  const customLinesMap = customLines
    ? new Map(customLines.map((l) => [l.bucketId, parseFloat(l.amount)]))
    : null;

  // 5. Execute DB write transaction
  const plan = await dbClient.transaction(async (tx) => {
    const [insertedPlan] = await tx
      .insert(allocationPlans)
      .values({
        tenantId,
        appId,
        incomeEventId,
        status: isFuturePlanned ? "PENDING" : "CONFIRMED",
        totalIncomeAmount: incomeAmount.toFixed(2),
        confirmedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    const linesToInsert = engineOutput.lines.map((line) => {
      const confirmedVal = customLinesMap?.has(line.bucketId)
        ? customLinesMap.get(line.bucketId)!
        : line.proposedAmount;

      return {
        tenantId,
        appId,
        planId: insertedPlan.id,
        categoryId: line.bucketId,
        proposedAmount: line.proposedAmount.toFixed(2),
        confirmedAmount: confirmedVal.toFixed(2),
        reasoning: line.reasoning,
        createdBy: userId,
        updatedBy: userId,
      };
    });

    const insertedLines = linesToInsert.length > 0
      ? await tx.insert(allocationPlanLines).values(linesToInsert).returning()
      : [];

    const ledgerEntriesToInsert = [];
    for (let i = 0; i < engineOutput.lines.length; i++) {
      const line = engineOutput.lines[i];
      const insertedLine = insertedLines[i];
      const confirmedVal = customLinesMap?.has(line.bucketId)
        ? customLinesMap.get(line.bucketId)!
        : line.proposedAmount;

      if (!isFuturePlanned && confirmedVal > 0 && insertedLine) {
        ledgerEntriesToInsert.push({
          tenantId,
          appId,
          categoryId: line.bucketId,
          planLineId: insertedLine.id,
          flowType: "CREDIT" as const,
          amount: confirmedVal.toFixed(2),
          idempotencyKey: `paydayalloc-${insertedLine.id}`,
          note: `Payday Allocation: ${line.reasoning}`,
          source: "MANUAL" as const,
          createdBy: userId,
          updatedBy: userId,
        });
      }
    }

    if (ledgerEntriesToInsert.length > 0) {
      await tx.insert(transactionLedger).values(ledgerEntriesToInsert);
    }

    if (!isFuturePlanned) {
      // Update income event status to CONFIRMED
      const updateData: {
        status: "CONFIRMED";
        actualAmount: string;
        updatedBy: string;
        updatedAt: Date;
        expectedDate?: string;
      } = {
        status: "CONFIRMED",
        actualAmount: incomeAmount.toFixed(2),
        updatedBy: userId,
        updatedAt: new Date(),
      };
      if (markAsReceivedToday && event) {
        updateData.expectedDate = new Date().toISOString().split("T")[0];
      }
      await tx
        .update(incomeEvents)
        .set(updateData)
        .where(eq(incomeEvents.id, incomeEventId));
    }

    return { ...insertedPlan, isFuturePlanned };
  });

  return plan;
}
