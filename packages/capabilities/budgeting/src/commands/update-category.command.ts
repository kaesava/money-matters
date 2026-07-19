import { db, categories } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { UpdateCategoryCommand } from "@money-matters/types";

export async function updateCategoryCommand(
  categoryId: string,
  input: z.infer<typeof UpdateCategoryCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  return await dbClient.transaction(async (tx) => {
    if (input.isDefaultExcess) {
      await tx
        .update(categories)
        .set({ isDefaultExcess: false, updatedBy: userId, updatedAt: new Date() })
        .where(
          and(
            eq(categories.tenantId, tenantId),
            eq(categories.appId, appId),
            eq(categories.isDefaultExcess, true)
          )
        );
    }

    const [updated] = await tx
      .update(categories)
      .set({
        name: input.name,
        isCommitted: input.isCommitted,
        monthlyAmount: input.monthlyAmount,
        isDefaultExcess: input.isDefaultExcess,
        icon: input.icon,
        colour: input.colour,
        bankAccountId: input.bankAccountId,
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

    return updated;
  });
}
