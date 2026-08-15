import { allocationPlans, allocationPlanLines, transactionLedger, incomeEvents, DbOrTx } from "@money-matters/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

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
  dbClient: DbOrTx
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

    // 2. Insert lines and ledger credit entries in bulk
    const linesToInsert = input.lines.map((line) => ({
      tenantId,
      appId,
      planId: plan.id,
      categoryId: line.categoryId,
      proposedAmount: line.confirmedAmount, // For V2, proposed = confirmed on override
      confirmedAmount: line.confirmedAmount,
      reasoning: line.reasoning || "Manual Override",
      createdBy: userId,
      updatedBy: userId,
    }));

    const insertedLines = linesToInsert.length > 0
      ? await tx.insert(allocationPlanLines).values(linesToInsert).returning()
      : [];

    const ledgerEntriesToInsert = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      const insertedLine = insertedLines[i];
      const amountVal = parseFloat(line.confirmedAmount);

      if (amountVal > 0 && insertedLine) {
        ledgerEntriesToInsert.push({
          tenantId,
          appId,
          categoryId: line.categoryId,
          planLineId: insertedLine.id,
          flowType: "CREDIT" as const,
          amount: line.confirmedAmount,
          idempotencyKey: `confirmalloc-${insertedLine.id}`,
          note: `Income Allocation: ${line.reasoning || "Confirmed Split"}`,
          source: "MANUAL" as const,
          createdBy: userId,
          updatedBy: userId,
        });
      }
    }

    if (ledgerEntriesToInsert.length > 0) {
      await tx.insert(transactionLedger).values(ledgerEntriesToInsert);
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
