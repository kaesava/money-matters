import { incomeEvents, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { previewAllocationQuery } from "./preview-allocation.query.js";

export async function previewPaydayQuery(
  incomeEventId: string,
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
) {
  const [targetEvent] = await dbClient
    .select()
    .from(incomeEvents)
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

  return await previewPaydayForEvent(targetEvent, tenantId, appId, dbClient);
}

export async function previewPaydayForEvent(
  targetEvent: { id: string; expectedDate: string; expectedAmount: string; actualAmount?: string | null; name?: string | null },
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
) {
  const { allocationPlans, allocationPlanLines, pools } = await import("@money-matters/db");
  const [existingPlan] = await dbClient
    .select()
    .from(allocationPlans)
    .where(
      and(
        eq(allocationPlans.incomeEventId, targetEvent.id),
        eq(allocationPlans.tenantId, tenantId),
        eq(allocationPlans.appId, appId),
        sql`${allocationPlans.archivedAt} IS NULL`
      )
    )
    .orderBy(sql`${allocationPlans.createdAt} DESC`)
    .limit(1);

  if (existingPlan) {
    const savedLines = await dbClient
      .select({
        id: allocationPlanLines.id,
        poolId: allocationPlanLines.poolId,
        proposedAmount: allocationPlanLines.proposedAmount,
        confirmedAmount: allocationPlanLines.confirmedAmount,
        reasoning: allocationPlanLines.reasoning,
        poolName: pools.name,
      })
      .from(allocationPlanLines)
      .leftJoin(pools, eq(pools.id, allocationPlanLines.poolId))
      .where(eq(allocationPlanLines.planId, existingPlan.id));

    if (savedLines.length > 0) {
      const lines = savedLines.map((l) => ({
        bucketId: l.poolId,
        bucketName: l.poolName ?? "Unknown Pool",
        proposedAmount: parseFloat(l.confirmedAmount || l.proposedAmount),
        reasoning: l.reasoning ?? "Custom saved allocation plan",
      }));

      const totalAllocated = lines.reduce((sum, l) => sum + l.proposedAmount, 0);
      const incomeAmt = parseFloat(targetEvent.actualAmount || targetEvent.expectedAmount);

      return {
        incomeEvent: {
          id: targetEvent.id,
          name: targetEvent.name || "Paycheck",
          expectedDate: targetEvent.expectedDate,
          expectedAmount: targetEvent.expectedAmount,
          actualAmount: targetEvent.actualAmount || targetEvent.expectedAmount,
        },
        engineResult: {
          status: "OK" as const,
          lines,
          unallocatedAmount: Math.max(0, incomeAmt - totalAllocated),
          // SAVED: user has an explicit PENDING draft; CONFIRMED: plan executed and pool balances updated
          isCustomPlan: existingPlan.status === "PENDING",
          isConfirmedPlan: existingPlan.status === "CONFIRMED",
        },
      };
    }
  }

  const incomeAmount = parseFloat(targetEvent.actualAmount || targetEvent.expectedAmount);
  const allocationResult = await previewAllocationQuery(tenantId, appId, targetEvent.id, incomeAmount, dbClient);

  const lines = Array.isArray(allocationResult)
    ? allocationResult.map((item) => ({
        bucketId: item.poolId,
        bucketName: item.poolName,
        proposedAmount: item.proposedAmount,
        reasoning: item.reasoning,
      }))
    : [];

  const totalAllocated = lines.reduce((sum, l) => sum + l.proposedAmount, 0);

  return {
    incomeEvent: {
      id: targetEvent.id,
      name: targetEvent.name || "Paycheck",
      expectedDate: targetEvent.expectedDate,
      expectedAmount: targetEvent.expectedAmount,
      actualAmount: targetEvent.actualAmount || targetEvent.expectedAmount,
    },
    engineResult: {
      status: "OK" as const,
      lines,
      unallocatedAmount: Math.max(0, incomeAmount - totalAllocated),
      isCustomPlan: false,
      isConfirmedPlan: false,
    },
  };
}
