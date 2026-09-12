import { pools, categories, allocationPlans, allocationPlanLines, transactionLedger, incomeEvents, incomeSources, expenseEvents, getPoolBalancesMap, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { runAllocationEngine, EngineBucket } from "../engine/allocation-engine.js";

import { getTenantDateString } from "@money-matters/core";

const getAestDateString = (d: Date = new Date()) => getTenantDateString(d);

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
  customLines?: { bucketId: string; amount: string; reasoning?: string }[],
  markAsReceivedToday?: boolean
) {
  // 1. Fetch Pools
  const dbPools = await dbClient
    .select()
    .from(pools)
    .where(
      and(
        eq(pools.tenantId, tenantId),
        eq(pools.appId, appId),
        sql`${pools.archivedAt} IS NULL`
      )
    );

  // 2. Fetch Categories
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

  const poolCategoryTargetsMap = new Map<string, number>();
  const poolIsEssentialMap = new Map<string, boolean>();
  for (const cat of dbCats) {
    if (cat.monthlyAmount) {
      const val = parseFloat(cat.monthlyAmount);
      poolCategoryTargetsMap.set(cat.poolId, (poolCategoryTargetsMap.get(cat.poolId) || 0) + val);
    }
    if (cat.isEssential) {
      poolIsEssentialMap.set(cat.poolId, true);
    }
  }

  // 3. Compute balances using DB-side aggregate SUM(CASE WHEN...)
  const balancesMap = await getPoolBalancesMap(tenantId, appId, dbClient);

  // 4. Fetch income event joined with income source to resolve dates & recurrence frequency
  const [eventWithSource] = await dbClient
    .select({
      id: incomeEvents.id,
      expectedDate: incomeEvents.expectedDate,
      rrule: incomeSources.rrule,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .where(eq(incomeEvents.id, incomeEventId));

  let freqDays = 14;
  if (eventWithSource?.rrule) {
    freqDays = parseRruleFrequencyDays(eventWithSource.rrule);
  }

  const todayStr = getAestDateString();
  const eventDateStr = eventWithSource ? eventWithSource.expectedDate : todayStr;
  const isFuturePlanned = eventDateStr > todayStr && !markAsReceivedToday;

  // 5. Fetch upcoming expenses due before the next cycle cutoff
  const eventTime = eventWithSource ? new Date(eventWithSource.expectedDate + "T00:00:00").getTime() : Date.now();
  const nextCutoffDateStr = getAestDateString(new Date(eventTime + freqDays * 24 * 60 * 60 * 1000));

  const pendingExpenses = await dbClient
    .select({
      id: expenseEvents.id,
      poolId: expenseEvents.poolId,
      categoryId: expenseEvents.categoryId,
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

  // Map to engine models
  const engineBuckets: EngineBucket[] = dbPools.map((pool) => {
    const balance = balancesMap[pool.id] || 0;
    const catTargetSum = poolCategoryTargetsMap.get(pool.id) || 0;

    const monthlyAmt = pool.poolType === "REGULAR" 
      ? (catTargetSum > 0 ? catTargetSum : (pool.targetAmount ? parseFloat(pool.targetAmount) : null))
      : (pool.targetAmount ? parseFloat(pool.targetAmount) : null);

    return {
      id: pool.id,
      name: pool.name,
      type: pool.poolType,
      isEssential: poolIsEssentialMap.get(pool.id) ?? false,
      isCommitted: pool.isCommitted,
      isSurplusTarget: pool.isSurplusTarget,
      rolloverRule: pool.rolloverRule,
      monthlyAmount: monthlyAmt,
      targetAmount: pool.targetAmount ? parseFloat(pool.targetAmount) : null,
      everydayAllowanceAmount: pool.everydayAllowanceAmount ? parseFloat(pool.everydayAllowanceAmount) : null,
      targetDate: pool.targetDate || null,
      currentBalance: balance,
    };
  });

  const engineOutput = runAllocationEngine({
    incomeAmount,
    buckets: engineBuckets,
    paycheckDate: eventWithSource ? new Date(eventWithSource.expectedDate + "T00:00:00+10:00") : new Date(),
    paycheckFrequencyDays: freqDays,
    upcomingExpenses: pendingExpenses.map((e) => ({
      poolId: e.poolId,
      categoryId: e.categoryId,
      name: e.name,
      amount: parseFloat(e.amount),
      dueDate: e.dueDate,
    })),
  });

  const customLinesMap = customLines
    ? new Map(customLines.map((l) => [l.bucketId, { amount: parseFloat(l.amount), reasoning: l.reasoning }]))
    : null;

  // 5. Execute DB write transaction
  const plan = await dbClient.transaction(async (tx) => {
    const [existingPlan] = await tx
      .select({ id: allocationPlans.id, status: allocationPlans.status })
      .from(allocationPlans)
      .where(and(eq(allocationPlans.incomeEventId, incomeEventId), eq(allocationPlans.tenantId, tenantId)))
      .limit(1);

    if (existingPlan) {
      if (existingPlan.status === "CONFIRMED") {
        throw new Error("Cannot re-run allocation over an already-confirmed payday. Revert the payday first.");
      }
      await tx.delete(allocationPlans).where(eq(allocationPlans.id, existingPlan.id));
    }

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
      const customItem = customLinesMap?.get(line.bucketId);
      const confirmedVal = customItem !== undefined ? customItem.amount : line.proposedAmount;
      const lineReasoning = customItem?.reasoning !== undefined ? customItem.reasoning : line.reasoning;

      return {
        tenantId,
        appId,
        planId: insertedPlan.id,
        poolId: line.bucketId,
        proposedAmount: line.proposedAmount.toFixed(2),
        confirmedAmount: confirmedVal.toFixed(2),
        reasoning: lineReasoning,
        createdBy: userId,
        updatedBy: userId,
      };
    });

    // Prune $0 lines upon confirmation; keep all lines in draft/pending so user can adjust them
    const finalLinesToInsert = isFuturePlanned
      ? linesToInsert
      : linesToInsert.filter((l) => parseFloat(l.confirmedAmount) > 0);

    const insertedLines = finalLinesToInsert.length > 0
      ? await tx.insert(allocationPlanLines).values(finalLinesToInsert).returning()
      : [];

    const ledgerEntriesToInsert = [];
    for (let i = 0; i < finalLinesToInsert.length; i++) {
      const line = finalLinesToInsert[i];
      const insertedLine = insertedLines[i];
      const confirmedVal = parseFloat(line.confirmedAmount);

      if (!isFuturePlanned && confirmedVal > 0 && insertedLine) {
        const pool = dbPools.find((p) => p.id === line.poolId);
        ledgerEntriesToInsert.push({
          tenantId,
          appId,
          poolId: line.poolId,
          bankAccountId: pool?.bankAccountId || null,
          planLineId: insertedLine.id,
          flowType: "CREDIT" as const,
          transactionType: "INCOME_SPLIT" as const,
          amount: confirmedVal.toFixed(2),
          idempotencyKey: `paydayalloc-${insertedLine.id}`,
          note: line.reasoning?.trim() || "Income Topup",
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
      // Update income event status to CONFIRMED with actualDate; NEVER mutate expectedDate!
      const updateData: {
        status: "CONFIRMED";
        actualAmount: string;
        actualDate: string;
        updatedBy: string;
        updatedAt: Date;
      } = {
        status: "CONFIRMED",
        actualAmount: incomeAmount.toFixed(2),
        actualDate: markAsReceivedToday ? getAestDateString() : (eventWithSource?.expectedDate || getAestDateString()),
        updatedBy: userId,
        updatedAt: new Date(),
      };
      await tx
        .update(incomeEvents)
        .set(updateData)
        .where(eq(incomeEvents.id, incomeEventId));
    }

    return { ...insertedPlan, isFuturePlanned };
  });

  return plan;
}

