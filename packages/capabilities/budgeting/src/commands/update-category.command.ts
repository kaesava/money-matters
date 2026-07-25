import { db, categories, categorySchedules } from "@money-matters/db";
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
        type: input.type as any,
        isCommitted: input.isCommitted,
        monthlyAmount: input.monthlyAmount,
        everydayAllowanceAmount: input.everydayAllowanceAmount,
        isDefaultExcess: input.isDefaultExcess,
        rolloverRule: input.rolloverRule,
        isDefaultSavings: input.isDefaultSavings,
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

    if (input.targetAmount !== undefined) {
      const [sched] = await tx
        .select()
        .from(categorySchedules)
        .where(
          and(
            eq(categorySchedules.categoryId, categoryId),
            eq(categorySchedules.tenantId, tenantId),
            eq(categorySchedules.appId, appId)
          )
        );

      if (sched) {
        await tx
          .update(categorySchedules)
          .set({
            targetAmount: input.targetAmount,
            targetDate: input.targetDate !== undefined ? input.targetDate : sched.targetDate,
            updatedBy: userId,
            updatedAt: new Date(),
          })
          .where(eq(categorySchedules.id, sched.id));
      } else {
        await tx.insert(categorySchedules).values({
          categoryId,
          targetAmount: input.targetAmount,
          targetDate: input.targetDate || null,
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        });
      }
    }

    return updated;
  });
}
