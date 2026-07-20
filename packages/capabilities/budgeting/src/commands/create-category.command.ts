import { db, categories, categorySchedules } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { CreateCategoryCommand } from "@money-matters/types";

export async function createCategoryCommand(
  input: z.infer<typeof CreateCategoryCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  return await dbClient.transaction(async (tx) => {
    // 1. If this is default excess, disable other default excess
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

    // 2. Insert category
    const [cat] = await tx
      .insert(categories)
      .values({
        name: input.name,
        type: input.type as any,
        isCommitted: input.isCommitted,
        monthlyAmount: input.monthlyAmount || null,
        isDefaultExcess: input.isDefaultExcess,
        rolloverRule: input.rolloverRule || "ROLLOVER",
        isDefaultSavings: input.isDefaultSavings || false,
        everydayTargetKeepAmount: input.everydayTargetKeepAmount || null,
        everydaySweepFrequency: input.everydaySweepFrequency || null,
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
