import { allocationPlans, allocationPlanLines, DbOrTx } from "@money-matters/db";
import { and, eq } from "drizzle-orm";

export async function resetAllocationPlanCommand(
  incomeEventId: string,
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
) {
  return await dbClient.transaction(async (tx) => {
    // Find unconfirmed pending draft allocation plan for this income event
    const [plan] = await tx
      .select({ id: allocationPlans.id })
      .from(allocationPlans)
      .where(
        and(
          eq(allocationPlans.incomeEventId, incomeEventId),
          eq(allocationPlans.tenantId, tenantId),
          eq(allocationPlans.appId, appId),
          eq(allocationPlans.status, "PENDING")
        )
      )
      .limit(1);

    if (!plan) {
      return { success: true, count: 0 };
    }

    // Delete allocation plan lines first
    await tx
      .delete(allocationPlanLines)
      .where(eq(allocationPlanLines.planId, plan.id));

    // Delete the allocation plan record
    await tx
      .delete(allocationPlans)
      .where(eq(allocationPlans.id, plan.id));

    return { success: true, count: 1, planId: plan.id };
  });
}
