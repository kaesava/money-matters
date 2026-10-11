import { envelopes, allocationPlans, allocationPlanLines, transactionLedger, incomeEvents, incomeSources, expenseEvents, getEnvelopeBalancesMap, tenants, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { runAllocationEngine, EngineBucket } from "../engine/allocation-engine.js";
import { getTenantDateString } from "@money-matters/core";

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
  markAsReceivedToday?: boolean,
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

  // 3. Fetch income event joined with income source to resolve dates & recurrence frequency
  const [eventWithSource] = await dbClient
    .select({
      id: incomeEvents.id,
      expectedDate: incomeEvents.expectedDate,
      rrule: incomeSources.rrule,
      incomeType: incomeSources.incomeType,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .where(eq(incomeEvents.id, incomeEventId));

  const [tenantRecord] = typeof (dbClient as any).select === "function"
    ? await dbClient
        .select({ timezone: tenants.timezone })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1)
    : [null];
  const tenantTz = tenantRecord?.timezone || "Australia/Sydney";
  const getLocalDateString = (d: Date = new Date()) => getTenantDateString(d, { timezone: tenantTz });

  let freqDays = 14;
  if (eventWithSource?.rrule) {
    freqDays = parseRruleFrequencyDays(eventWithSource.rrule);
  }

  const todayStr = getLocalDateString();
  const eventDateStr = eventWithSource ? eventWithSource.expectedDate : todayStr;
  const isFuturePlanned = eventDateStr > todayStr && !markAsReceivedToday;

  // 4. Fetch upcoming expenses due before the next cycle cutoff
  const eventTime = eventWithSource ? new Date(eventWithSource.expectedDate + "T00:00:00").getTime() : Date.now();
  const nextCutoffDateStr = getLocalDateString(new Date(eventTime + freqDays * 24 * 60 * 60 * 1000));

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

  // Map to engine models
  const engineBuckets: EngineBucket[] = dbEnvelopes.map((env) => {
    const balance = balancesMap[env.id] || 0;
    return {
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
      currentBalance: balance,
      isPrivate: env.isPrivate,
      userId: env.userId ?? undefined,
    };
  });

  const engineOutput = runAllocationEngine({
    incomeAmount,
    incomeType: eventWithSource?.incomeType || "SALARIED",
    runwayDays: runwayDays ?? 30,
    buckets: engineBuckets,
    paycheckDate: eventWithSource ? new Date(eventWithSource.expectedDate + "T00:00:00+10:00") : new Date(),
    paycheckFrequencyDays: freqDays,
    upcomingExpenses: pendingExpenses.map((e) => ({
      envelopeId: e.envelopeId,
      name: e.name,
      amount: parseFloat(e.amount),
      dueDate: e.dueDate,
    })),
  });

  const customLinesMap = customLines
    ? new Map(customLines.map((l) => [l.bucketId, { amount: parseFloat(l.amount), reasoning: l.reasoning }]))
    : null;

  const tx = dbClient;
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
      envelopeId: line.bucketId,
      proposedAmount: line.proposedAmount.toFixed(2),
      confirmedAmount: confirmedVal.toFixed(2),
      reasoning: lineReasoning,
      createdBy: userId,
      updatedBy: userId,
    };
  });

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
      const env = dbEnvelopes.find((e) => e.id === line.envelopeId);
      ledgerEntriesToInsert.push({
        tenantId,
        appId,
        envelopeId: line.envelopeId,
        bankAccountId: env?.bankAccountId || null,
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
    const updateData: {
      status: "CONFIRMED";
      actualAmount: string;
      actualDate: string;
      updatedBy: string;
      updatedAt: Date;
    } = {
      status: "CONFIRMED",
      actualAmount: incomeAmount.toFixed(2),
      actualDate: markAsReceivedToday ? getLocalDateString() : (eventWithSource?.expectedDate || getLocalDateString()),
      updatedBy: userId,
      updatedAt: new Date(),
    };
    await tx
      .update(incomeEvents)
      .set(updateData)
      .where(eq(incomeEvents.id, incomeEventId));
  }

  const plan = { ...insertedPlan, isFuturePlanned };
  return plan;
}
