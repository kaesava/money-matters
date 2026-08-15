import { categories, categorySchedules, DbOrTx } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
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
    if (input.isSurplusTarget === true) {
      // Clear isSurplusTarget from any existing goal category in this tenant
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

    const [updated] = await tx
      .update(categories)
      .set({
        name: input.name,
        type: input.type,
        isCommitted: input.isCommitted,
        isEssential: input.isEssential,
        isSurplusTarget: input.isSurplusTarget,
        monthlyAmount: input.monthlyAmount,
        everydayAllowanceAmount: input.everydayAllowanceAmount,
        enteredAmount: input.enteredAmount,
        budgetFrequency: input.budgetFrequency,
        rolloverRule: input.rolloverRule,
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
