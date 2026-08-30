import { categories, pools, DbOrTx } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
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
    const [targetPool] = await tx
      .select({ id: pools.id })
      .from(pools)
      .where(
        and(
          eq(pools.id, input.poolId),
          eq(pools.tenantId, tenantId),
          eq(pools.appId, appId),
          sql`${pools.archivedAt} IS NULL`
        )
      )
      .limit(1);

    if (!targetPool) {
      throw new Error("Pool not found or access unauthorized.");
    }

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

