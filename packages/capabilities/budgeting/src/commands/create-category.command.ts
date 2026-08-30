import { categories, DbOrTx } from "@money-matters/db";
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
    const [cat] = await tx
      .insert(categories)
      .values({
        poolId: input.poolId,
        name: input.name,
        isEssential: input.isEssential ?? false,
        monthlyAmount: input.monthlyAmount || null,
        enteredAmount: input.enteredAmount || null,
        budgetFrequency: input.budgetFrequency || "MONTHLY",
        icon: input.icon || null,
        colour: input.colour || null,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return cat;
  });
}
