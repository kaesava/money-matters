import { categories, categorySchedules, DbOrTx } from "@money-matters/db";
import { z } from "zod";
import { CreateCategoryCommand } from "@money-matters/types";

export async function createCategoryCommand(
  input: z.infer<typeof CreateCategoryCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {

  return await dbClient.transaction(async (tx) => {
    if (input.isSurplusTarget === true) {
      const { and, eq } = await import("drizzle-orm");
      await tx
        .update(categories)
        .set({ isSurplusTarget: false })
        .where(
          and(
            eq(categories.tenantId, tenantId),
            eq(categories.appId, appId),
            eq(categories.isSurplusTarget, true)
          )
        );
    }

    // 1. Insert category
    const [cat] = await tx
      .insert(categories)
      .values({
        name: input.name,
        type: input.type,
        isPrivate: input.isPrivate ?? false,
        userId: input.isPrivate ? userId : null,
        isCommitted: input.isCommitted,
        isEssential: input.isEssential ?? false,
        isSurplusTarget: input.isSurplusTarget ?? false,
        monthlyAmount: input.monthlyAmount || null,
        everydayAllowanceAmount: input.everydayAllowanceAmount || null,
        enteredAmount: input.enteredAmount || null,
        budgetFrequency: input.budgetFrequency || "MONTHLY",
        rolloverRule: input.rolloverRule || "ROLLOVER",
        icon: input.icon || null,
        colour: input.colour || null,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();


    if (input.targetAmount && input.type === "GOAL") {
      await tx.insert(categorySchedules).values({
        categoryId: cat.id,
        targetAmount: input.targetAmount,
        targetDate: input.targetDate || null,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      });
    }

    return cat;
  });
}
