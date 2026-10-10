import { categories, pools, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { UpdateCategoryCommand } from "@money-matters/types";
import {
  deriveRruleFromFrequency,
  computeDefaultStartDate,
  burstCategoryEvents,
  clearScheduledCategoryEvents,
} from "./category-schedule.js";

export async function updateCategoryCommand(
  categoryId: string,
  input: z.infer<typeof UpdateCategoryCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  const runInTx =
    typeof dbClient.transaction === "function"
      ? (cb: (tx: DbOrTx) => Promise<typeof categories.$inferSelect>) => dbClient.transaction(cb)
      : (cb: (tx: DbOrTx) => Promise<typeof categories.$inferSelect>) => cb(dbClient);

  return await runInTx(async (tx) => {
    // 1. Fetch current category and pool type
    const [existing] = await tx
      .select({
        id: categories.id,
        poolId: categories.poolId,
        poolType: pools.poolType,
        name: categories.name,
        monthlyAmount: categories.monthlyAmount,
        enteredAmount: categories.enteredAmount,
        budgetFrequency: categories.budgetFrequency,
        startDate: categories.startDate,
        endDate: categories.endDate,
        rrule: categories.rrule,
      })
      .from(categories)
      .innerJoin(pools, eq(categories.poolId, pools.id))
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId)
        )
      );

    if (!existing) {
      throw new Error("Category not found or access unauthorized.");
    }

    const isRegular = existing.poolType === "REGULAR";
    const budgetFrequency = input.budgetFrequency ?? existing.budgetFrequency;
    const rrule = isRegular
      ? input.rrule ?? (input.budgetFrequency ? deriveRruleFromFrequency(budgetFrequency) : existing.rrule)
      : input.rrule ?? existing.rrule;
    const startDate = isRegular
      ? input.startDate ?? (existing.startDate || computeDefaultStartDate())
      : input.startDate ?? existing.startDate;
    const endDate = input.endDate !== undefined ? input.endDate : existing.endDate;

    const [updated] = await tx
      .update(categories)
      .set({
        name: input.name,
        isEssential: input.isEssential,
        monthlyAmount: input.monthlyAmount,
        enteredAmount: input.enteredAmount,
        budgetFrequency: input.budgetFrequency,
        icon: input.icon,
        startDate,
        endDate,
        rrule,
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

    // Re-burst scheduled events if schedule parameters or amount changed
    const scheduleChanged =
      input.rrule !== undefined ||
      input.startDate !== undefined ||
      input.endDate !== undefined ||
      input.budgetFrequency !== undefined ||
      input.enteredAmount !== undefined ||
      input.monthlyAmount !== undefined ||
      input.name !== undefined;

    if (isRegular && scheduleChanged && rrule && startDate) {
      await clearScheduledCategoryEvents(tx, categoryId, tenantId, appId);
      const amountVal = updated.enteredAmount || updated.monthlyAmount || "0.00";
      if (parseFloat(amountVal) > 0) {
        await burstCategoryEvents(tx, {
          categoryId,
          poolId: existing.poolId,
          name: updated.name,
          amount: amountVal,
          rrule,
          startDate,
          endDate,
          tenantId,
          appId,
          userId,
        });
      }
    }

    return updated;
  });
}

