import {
  incomeEvents,
  incomeSources,
  envelopes,
  transactionLedger,
  allocationPlans,
  allocationPlanLines,
  expenseEvents,
  DbOrTx,
} from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import {
  runCumulativeProjection,
  CumulativeProjectionIncomeEvent,
  CumulativeProjectionExpenseEvent,
  SavedPlanLineItem,
} from "../engine/cumulative-projection.js";
import { EngineBucket } from "../engine/allocation-engine.js";
import { previewAllocationQuery } from "./preview-allocation.query.js";

export async function previewPaydayQuery(
  incomeEventId: string,
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
) {
  const [targetEvent] = await dbClient
    .select({
      id: incomeEvents.id,
      expectedDate: incomeEvents.expectedDate,
      expectedAmount: incomeEvents.expectedAmount,
      actualAmount: incomeEvents.actualAmount,
      name: sql`COALESCE(NULLIF(${incomeEvents.name}, ""), ${incomeSources.name}, "Paycheck")`,
      receivingAccountId: incomeSources.receivingAccountId,
      incomeType: incomeSources.incomeType,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .where(
      and(
        eq(incomeEvents.id, incomeEventId),
        eq(incomeEvents.tenantId, tenantId),
        eq(incomeEvents.appId, appId),
        sql`${incomeEvents.archivedAt} IS NULL`
      )
    );

  if (!targetEvent) {
    throw new Error("Target income event not found.");
  }

  return await previewPaydayForEvent({ ...targetEvent, name: targetEvent.name as string | null }, tenantId, appId, dbClient);
}

export async function previewPaydayForEvent(
  targetEvent: { id: string; expectedDate: string; expectedAmount: string; actualAmount?: string | null; name?: string | null; receivingAccountId?: string | null; incomeType?: "SALARIED" | "IRREGULAR" | null },
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
) {
  const [savedPlan] = await dbClient
    .select({
      id: allocationPlans.id,
      status: allocationPlans.status,
      confirmedAt: allocationPlans.confirmedAt,
      totalIncomeAmount: allocationPlans.totalIncomeAmount,
    })
    .from(allocationPlans)
    .where(
      and(
        eq(allocationPlans.incomeEventId, targetEvent.id),
        eq(allocationPlans.tenantId, tenantId),
        eq(allocationPlans.appId, appId),
        sql`${allocationPlans.archivedAt} IS NULL`
      )
    );

  let savedLines: Array<{
    id: string;
    envelopeId: string;
    proposedAmount: string;
    confirmedAmount: string | null;
    reasoning: string | null;
  }> = [];

  if (savedPlan) {
    savedLines = await dbClient
      .select({
        id: allocationPlanLines.id,
        envelopeId: allocationPlanLines.envelopeId,
        proposedAmount: allocationPlanLines.proposedAmount,
        confirmedAmount: allocationPlanLines.confirmedAmount,
        reasoning: allocationPlanLines.reasoning,
      })
      .from(allocationPlanLines)
      .where(
        and(
          eq(allocationPlanLines.planId, savedPlan.id),
          eq(allocationPlanLines.tenantId, tenantId),
          eq(allocationPlanLines.appId, appId),
          sql`${allocationPlanLines.archivedAt} IS NULL`
        )
      );
  }

  const effectiveAmount = parseFloat(targetEvent.actualAmount || targetEvent.expectedAmount);
  const baselinePreview = await previewAllocationQuery(
    tenantId,
    appId,
    targetEvent.id,
    effectiveAmount,
    dbClient
  );

  const baselineMap = new Map(baselinePreview.lines.map((l) => [l.bucketId, l]));

  const lines = baselinePreview.lines.map((bLine) => {
    const saved = savedLines.find((s) => s.envelopeId === bLine.bucketId);
    return {
      envelopeId: bLine.bucketId,
      envelopeName: bLine.bucketName,
      proposedAmount: bLine.proposedAmount,
      savedAmount: saved ? parseFloat(saved.confirmedAmount || saved.proposedAmount) : null,
      reasoning: saved?.reasoning || bLine.reasoning,
      isModified: saved ? Math.abs(parseFloat(saved.confirmedAmount || saved.proposedAmount) - bLine.proposedAmount) > 0.01 : false,
    };
  });

  return {
    incomeEventId: targetEvent.id,
    incomeEventName: targetEvent.name || "Paycheck",
    expectedDate: targetEvent.expectedDate,
    expectedAmount: parseFloat(targetEvent.expectedAmount),
    actualAmount: targetEvent.actualAmount ? parseFloat(targetEvent.actualAmount) : null,
    receivingAccountId: targetEvent.receivingAccountId || null,
    hasSavedPlan: Boolean(savedPlan),
    planStatus: savedPlan?.status || "NONE",
    lines,
    totalAllocated: lines.reduce((sum, l) => sum + (l.savedAmount ?? l.proposedAmount), 0),
  };
}
