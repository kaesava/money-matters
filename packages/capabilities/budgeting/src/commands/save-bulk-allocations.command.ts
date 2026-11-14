import {
  allocationPlans,
  allocationPlanLines,
  incomeEvents,
  incomeSources,
  bankAccounts,
  type DbOrTx,
} from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { previewAllocationQuery } from "../queries/preview-allocation.query.js";

async function loadPendingIncomeEvent(
  incomeEventId: string,
  tenantId: string,
  userId: string,
  db: DbOrTx
) {
  const [incomeEvt] = await db
    .select({
      evt: incomeEvents,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
    .where(and(eq(incomeEvents.id, incomeEventId), eq(incomeEvents.tenantId, tenantId), sql`${incomeEvents.archivedAt} IS NULL`))
    .limit(1);

  if (!incomeEvt || (incomeEvt.bankAccountIsPrivate && incomeEvt.bankAccountUserId !== userId)) {
    throw new Error("Income event not found.");
  }
  return incomeEvt.evt;
}

async function upsertPendingPlanLines(
  tx: DbOrTx,
  incomeEventId: string,
  totalIncomeAmount: string,
  lines: Array<{ envelopeId: string; proposedAmount: string; reasoning: string | null }>,
  tenantId: string,
  appId: string,
  userId: string
) {
  let [plan] = await tx
    .select()
    .from(allocationPlans)
    .where(and(eq(allocationPlans.incomeEventId, incomeEventId), eq(allocationPlans.status, "PENDING"), sql`${allocationPlans.archivedAt} IS NULL`))
    .limit(1);

  if (!plan) {
    const [newPlan] = await tx
      .insert(allocationPlans)
      .values({ incomeEventId, totalIncomeAmount, status: "PENDING", tenantId, appId, createdBy: userId, updatedBy: userId })
      .returning();
    plan = newPlan;
  } else {
    await tx
      .update(allocationPlans)
      .set({ totalIncomeAmount, updatedAt: new Date(), updatedBy: userId })
      .where(eq(allocationPlans.id, plan.id));
  }

  await tx.delete(allocationPlanLines).where(eq(allocationPlanLines.planId, plan.id));

  if (lines.length > 0) {
    await tx.insert(allocationPlanLines).values(
      lines.map((l) => ({
        planId: plan.id,
        envelopeId: l.envelopeId,
        proposedAmount: l.proposedAmount,
        reasoning: l.reasoning,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      }))
    );
  }
  return { success: true, planId: plan.id };
}

/**
 * Saves custom draft allocation lines for a pending payday income event.
 */
export async function saveBulkAllocationsCommand(
  input: {
    incomeEventId: string;
    totalIncomeAmount: string;
    lines: Array<{ envelopeId?: string; poolId?: string; proposedAmount: string; reasoning?: string }>;
  },
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  return db.transaction(async (tx) => {
    const evt = await loadPendingIncomeEvent(input.incomeEventId, tenantId, userId, tx);
    if (evt.status !== "PENDING") {
      throw new Error("Cannot save allocations for a payday that is no longer upcoming or has been processed.");
    }
    const normalizedLines = input.lines.map((l) => ({
      envelopeId: (l.envelopeId || l.poolId)!,
      proposedAmount: l.proposedAmount,
      reasoning: l.reasoning || null,
    }));
    return upsertPendingPlanLines(tx, input.incomeEventId, input.totalIncomeAmount, normalizedLines, tenantId, appId, userId);
  });
}

/**
 * Re-computes recommended allocation lines for a pending payday and saves them as a PENDING draft.
 */
export async function saveAutoAllocationCommand(
  input: { incomeEventId: string; totalIncomeAmount: string },
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  await loadPendingIncomeEvent(input.incomeEventId, tenantId, userId, db);
  const allocationResult = await previewAllocationQuery(
    tenantId,
    appId,
    input.incomeEventId,
    parseFloat(input.totalIncomeAmount),
    db,
    undefined,
    userId
  );
  return db.transaction((tx) =>
    upsertPendingPlanLines(
      tx,
      input.incomeEventId,
      input.totalIncomeAmount,
      allocationResult.lines.map((l) => ({
        envelopeId: l.bucketId,
        proposedAmount: l.proposedAmount.toFixed(2),
        reasoning: l.reasoning,
      })),
      tenantId,
      appId,
      userId
    )
  );
}
