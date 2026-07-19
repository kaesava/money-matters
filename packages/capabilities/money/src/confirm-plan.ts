import { db, allocationPlans, allocationPlanLines, transactionLedger, incomeEvents } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";

export async function confirmPaydayAllocationPlan(
  tenantId: string,
  appId: string,
  userId: string,
  planId: string,
  linesInput: { lineId: string; confirmedAmount: string; deferred?: boolean }[],
  dbClient: PgDatabase<any, any, any> = db
) {
  return await dbClient.transaction(async (tx) => {
    // 1. Fetch the target draft allocation plan to confirm access and status bounds
    const [plan] = await tx
      .select()
      .from(allocationPlans)
      .where(
        and(
          eq(allocationPlans.id, planId),
          eq(allocationPlans.tenantId, tenantId),
          eq(allocationPlans.appId, appId)
        )
      );

    if (!plan) {
      throw new Error("Allocation plan not found or access unauthorized.");
    }
    if (plan.status === "CONFIRMED") {
      throw new Error("Allocation plan has already been confirmed.");
    }

    // 2. Map input amounts to resolve updates
    const confirmedLinesMap = new Map(
      linesInput.map(l => [l.lineId, l.confirmedAmount])
    );

    // 3. Retrieve lines associated with target plan
    const dbLines = await tx
      .select()
      .from(allocationPlanLines)
      .where(eq(allocationPlanLines.planId, planId));

    // 4. Update confirmed amount on lines and generate ledger transactions
    for (const line of dbLines) {
      const confirmedValue = confirmedLinesMap.get(line.id) || line.proposedAmount;
      const amountFloat = parseFloat(confirmedValue);

      // Support deferring plan line updates (set confirmedAmount to '0.00' and skip credit insert if deferred)
      const isDeferred = linesInput.find(l => l.lineId === line.id)?.deferred ?? false;

      if (isDeferred) {
        await tx
          .update(allocationPlanLines)
          .set({
            confirmedAmount: "0.00",
            updatedBy: userId,
            updatedAt: new Date()
          })
          .where(eq(allocationPlanLines.id, line.id));
      } else {
        await tx
          .update(allocationPlanLines)
          .set({
            confirmedAmount: confirmedValue,
            updatedBy: userId,
            updatedAt: new Date()
          })
          .where(eq(allocationPlanLines.id, line.id));

        if (amountFloat > 0) {
          // Record CREDIT transaction posting in the ledger
          const idempotencyKey = `plan-confirm-${planId}-line-${line.id}-${randomUUID()}`;
          await tx
            .insert(transactionLedger)
            .values({
              categoryId: line.categoryId,
              planLineId: line.id,
              flowType: "CREDIT",
              amount: confirmedValue,
              idempotencyKey,
              note: `Paycheck allocation confirm: ${line.reasoning || ""}`,
              recordedAt: new Date(),
              tenantId,
              appId,
              createdBy: userId,
              updatedBy: userId
            });
        }
      }
    }

    // 5. Update parent IncomeEvent status to CONFIRMED
    await tx
      .update(incomeEvents)
      .set({
        status: "CONFIRMED",
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(incomeEvents.id, plan.incomeEventId));

    // 6. Update Allocation Plan status to CONFIRMED
    const [confirmedPlan] = await tx
      .update(allocationPlans)
      .set({
        status: "CONFIRMED",
        confirmedAt: new Date(),
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(allocationPlans.id, planId))
      .returning();

    return confirmedPlan;
  });
}
