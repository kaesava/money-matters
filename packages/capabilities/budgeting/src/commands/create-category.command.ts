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
    // 1. Insert category
    const [cat] = await tx
      .insert(categories)
      .values({
        name: input.name,
        type: input.type,
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
