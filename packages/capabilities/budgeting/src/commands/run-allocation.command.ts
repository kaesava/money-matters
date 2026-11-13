import { envelopes, allocationPlans, allocationPlanLines, transactionLedger, incomeEvents, incomeSources, expenseEvents, bankAccounts, getEnvelopeBalancesMap, tenants, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { runAllocationEngine, EngineBucket } from "../engine/allocation-engine.js";
import { getTenantDateString } from "@money-matters/core";
import { TargetCelebrationItem } from "@money-matters/types";

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
  // 1. Fetch Envelopes joined with bankAccounts
  const rawEnvelopes = await dbClient
    .select({
      envelope: envelopes,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(envelopes)
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        sql`${envelopes.archivedAt} IS NULL`
      )
    );

  const dbEnvelopes = rawEnvelopes
    .filter((row) => {
      if (row.envelope.isPrivate && row.envelope.userId !== userId) return false;
      if (row.bankAccountIsPrivate && row.bankAccountUserId !== userId) return false;
      return true;
    })
    .map((row) => row.envelope);

  // 2. Compute balances using DB-side aggregate SUM(CASE WHEN...)
  const balancesMap = await getEnvelopeBalancesMap(tenantId, appId, dbClient);

  // 3. Fetch income event joined with income source and bank account to resolve dates, recurrence, and owner user ID
  const [eventWithSource] = await dbClient
    .select({
      id: incomeEvents.id,
      expectedDate: incomeEvents.expectedDate,
      rrule: incomeSources.rrule,
      incomeType: incomeSources.incomeType,
      contributionMode: sql<"FULL" | "PERCENTAGE" | "FIXED_AMOUNT">`COALESCE(${incomeEvents.contributionMode}, ${incomeSources.contributionMode}, 'FULL')`,
      contributionValue: sql<string | null>`COALESCE(${incomeEvents.contributionValue}, ${incomeSources.contributionValue})`,
      bankAccountUserId: bankAccounts.userId,
      bankAccountIsPrivate: bankAccounts.isPrivate,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
    .where(eq(incomeEvents.id, incomeEventId));

  if (!eventWithSource) {
    throw new Error("Income event not found.");
  }

  if (
    eventWithSource.bankAccountIsPrivate &&
    eventWithSource.bankAccountUserId !== userId
  ) {
    throw new Error("Income event not found.");
  }

  const incomeUserId = eventWithSource.bankAccountUserId || undefined;

  const [tenantRecord] = await dbClient
    .select({ timezone: tenants.timezone })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  const tenantTz = tenantRecord?.timezone || "UTC";
  const getLocalDateString = (d: Date = new Date()) => getTenantDateString(d, { timezone: tenantTz });

  let freqDays = 14;
  if (eventWithSource?.rrule) {
    freqDays = parseRruleFrequencyDays(eventWithSource.rrule);
  }

  const todayStr = getLocalDateString();
  const eventDateStr = eventWithSource ? eventWithSource.expectedDate : todayStr;
  const isFuturePlanned = eventDateStr > todayStr && !markAsReceivedToday;

  // 4. Fetch upcoming expenses due before the next cycle cutoff + forward window for dynamic sinking
  const bufferDays = 3;
  const eventTime = eventWithSource ? new Date(eventWithSource.expectedDate + "T00:00:00").getTime() : Date.now();
  const forwardWindowDays = 90;
  const forwardCutoffDateStr = getLocalDateString(new Date(eventTime + forwardWindowDays * 24 * 60 * 60 * 1000));

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
        sql`${expenseEvents.expectedDate} <= ${forwardCutoffDateStr}`,
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );

  const visibleEnvelopeIds = new Set(dbEnvelopes.map((e) => e.id));
  const filteredPendingExpenses = pendingExpenses.filter((e) => visibleEnvelopeIds.has(e.envelopeId));

  const { mapEnvelopeToEngineBucket } = await import("../engine/envelope-engine-mapper.js");
  const { getActiveAllocationStrategyQuery } = await import("../queries/get-active-allocation-strategy.query.js");
  const activeStrategy = await getActiveAllocationStrategyQuery(tenantId, appId, userId, dbClient, false);
  const personalStrategy = incomeUserId
    ? await getActiveAllocationStrategyQuery(tenantId, appId, incomeUserId, dbClient, true)
    : null;

  const engineBuckets: EngineBucket[] = dbEnvelopes.map((env) =>
    mapEnvelopeToEngineBucket(env, balancesMap[env.id] || 0)
  );

  const engineOutput = runAllocationEngine({
    incomeAmount,
    incomeType: eventWithSource?.incomeType || "SALARIED",
    incomeUserId,
    contributionMode: eventWithSource?.contributionMode || "FULL",
    contributionValue: eventWithSource?.contributionValue ? parseFloat(eventWithSource.contributionValue) : null,
    strategySteps: activeStrategy?.steps?.map((s) => ({
      stepType: s.stepType,
      targetEnvelopeId: s.targetEnvelopeId,
      config: s.config as Record<string, unknown> | null,
    })),
    personalStrategySteps: personalStrategy?.steps?.map((s) => ({
      stepType: s.stepType,
      targetEnvelopeId: s.targetEnvelopeId,
      config: s.config as Record<string, unknown> | null,
    })),
    runwayDays: runwayDays ?? 30,
    buckets: engineBuckets,
    paycheckDate: eventWithSource ? new Date(eventWithSource.expectedDate + "T00:00:00Z") : new Date(),
    paycheckFrequencyDays: freqDays,
    dueBufferDays: bufferDays,
    timezone: tenantTz,
    upcomingExpenses: filteredPendingExpenses.map((e) => ({
      envelopeId: e.envelopeId,
      name: e.name,
      amount: parseFloat(e.amount),
      dueDate: e.dueDate,
    })),
  });

  const customLinesMap = customLines
    ? new Map(customLines.map((l) => [l.bucketId, { amount: parseFloat(l.amount), reasoning: l.reasoning }]))
    : null;

  return (await dbClient.transaction(async (tx) => {
    const [existingPlan] = await tx
    .select({ id: allocationPlans.id, status: allocationPlans.status })
    .from(allocationPlans)
    .where(and(eq(allocationPlans.incomeEventId, incomeEventId), eq(allocationPlans.tenantId, tenantId)))
    .limit(1);

    if (existingPlan) {
      if (existingPlan.status === "CONFIRMED") {
        throw new Error("Cannot re-run allocation over an already-confirmed payday. Revert the payday first.");
      }
      await tx
        .update(allocationPlans)
        .set({ archivedAt: new Date(), updatedAt: new Date(), updatedBy: userId })
        .where(eq(allocationPlans.id, existingPlan.id));
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

  // Celebration detection across all combinations of goals and bills
  const targetsHit: TargetCelebrationItem[] = [];
  if (!isFuturePlanned) {
    for (let i = 0; i < finalLinesToInsert.length; i++) {
      const line = finalLinesToInsert[i];
      const confirmedVal = parseFloat(line.confirmedAmount);
      if (confirmedVal <= 0) continue;

      const env = dbEnvelopes.find((e) => e.id === line.envelopeId);
      if (!env) continue;

      const preBal = balancesMap[env.id] || 0;
      const postBal = preBal + confirmedVal;
      const isGoal = env.envelopeType === "GOAL";
      const isOngoingGoal = isGoal && env.fundingMode === "RECURRING";

      if (env.isSurplusTarget) {
        targetsHit.push({
          id: env.id,
          name: env.name,
          type: "SURPLUS_SWEPT",
          amount: confirmedVal,
        });
      } else if (isGoal) {
        const targetVal = env.targetAmount ? parseFloat(env.targetAmount) : 0;
        if (!isOngoingGoal && targetVal > 0 && preBal < targetVal && postBal >= targetVal) {
          targetsHit.push({
            id: env.id,
            name: env.name,
            type: "GOAL_TARGET_MET",
            amount: postBal,
            targetAmount: targetVal,
          });
        } else if (isOngoingGoal) {
          targetsHit.push({
            id: env.id,
            name: env.name,
            type: "RECURRING_GOAL_FUNDED",
            amount: confirmedVal,
            targetAmount: targetVal > 0 ? targetVal : undefined,
          });
        }
      }
    }

    const billLines = finalLinesToInsert.filter((l) => {
      const env = dbEnvelopes.find((e) => e.id === l.envelopeId);
      return env && env.envelopeType === "BILL";
    });
    if (billLines.length > 0) {
      const totalBillsAllocated = billLines.reduce((acc, l) => acc + (parseFloat(l.confirmedAmount) || 0), 0);
      if (totalBillsAllocated > 0) {
        targetsHit.push({
          id: "bills-ring-fenced",
          name: "Upcoming Bills Ring-Fenced",
          type: "BILLS_COVERED",
          amount: totalBillsAllocated,
        });
      }
    }
  }

    const plan = { ...insertedPlan, isFuturePlanned, celebration: { targetsHit } };
    return plan;
  })) as typeof allocationPlans.$inferSelect & {
    isFuturePlanned: boolean;
    celebration: { targetsHit: TargetCelebrationItem[] };
  };
}
