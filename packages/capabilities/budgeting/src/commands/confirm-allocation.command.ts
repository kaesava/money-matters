import { db, allocationPlans, allocationPlanLines, transactionLedger, incomeEvents } from "@money-matters/db";
import { eq } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { randomUUID } from "crypto";

export const ConfirmAllocationInput = z.object({
  incomeEventId: z.string().uuid(),
  incomeAmount: z.number().positive(),
  lines: z.array(
    z.object({
      categoryId: z.string().uuid(),
      confirmedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      reasoning: z.string().optional(),
    }).strict()
  ),
}).strict();

export async function confirmAllocationCommand(
  input: z.infer<typeof ConfirmAllocationInput>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  return await dbClient.transaction(async (tx) => {
    // 1. Create allocation plan
    const [plan] = await tx
      .insert(allocationPlans)
      .values({
        tenantId,
        appId,
        incomeEventId: input.incomeEventId,
        status: "CONFIRMED",
        totalIncomeAmount: input.incomeAmount.toFixed(2),
        confirmedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    // 2. Insert lines and ledger credit entries
    for (const line of input.lines) {
      const amountVal = parseFloat(line.confirmedAmount);

      const [insertedLine] = await tx
        .insert(allocationPlanLines)
        .values({
          tenantId,
          appId,
          planId: plan.id,
          categoryId: line.categoryId,
          proposedAmount: line.confirmedAmount, // For V2, proposed = confirmed on override
          confirmedAmount: line.confirmedAmount,
          reasoning: line.reasoning || "Manual Override",
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      // If split amount is positive, insert credit ledger entry
      if (amountVal > 0) {
        await tx.insert(transactionLedger).values({
          tenantId,
          appId,
          categoryId: line.categoryId,
          planLineId: insertedLine.id,
          flowType: "CREDIT",
          amount: line.confirmedAmount,
          idempotencyKey: `confirmalloc-${insertedLine.id}`,
          note: `Income Allocation: ${line.reasoning || "Confirmed Split"}`,
          source: "MANUAL",
          createdBy: userId,
          updatedBy: userId,
        });
      }
    }

    // 3. Mark income event as CONFIRMED
    await tx
      .update(incomeEvents)
      .set({
        status: "CONFIRMED",
        actualAmount: input.incomeAmount.toFixed(2),
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(incomeEvents.id, input.incomeEventId));

    return plan;
  });
}
