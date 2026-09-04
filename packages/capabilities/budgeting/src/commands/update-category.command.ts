import { categories, pools, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { UpdateCategoryCommand } from "@money-matters/types";

export async function updateCategoryCommand(
  categoryId: string,
  input: z.infer<typeof UpdateCategoryCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  return await dbClient.transaction(async (tx) => {
    const [updated] = await tx
      .update(categories)
      .set({
        name: input.name,
        isEssential: input.isEssential,
        monthlyAmount: input.monthlyAmount,
        enteredAmount: input.enteredAmount,
        budgetFrequency: input.budgetFrequency,
        icon: input.icon,
        colour: input.colour,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Category not found or access unauthorized.");
    }

    return updated;
  });
}

