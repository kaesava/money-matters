import { categories, pools, DbOrTx } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { CreateCategoryCommand } from "@money-matters/types";
import {
  deriveRruleFromFrequency,
  computeDefaultStartDate,
  burstCategoryEvents,
} from "./category-schedule.js";

export async function createCategoryCommand(
  input: z.infer<typeof CreateCategoryCommand>,
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
    const [targetPool] = await tx
      .select({ id: pools.id, poolType: pools.poolType })
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

    const isRegular = targetPool.poolType === "REGULAR";
    const rrule = isRegular
      ? input.rrule || deriveRruleFromFrequency(input.budgetFrequency)
      : input.rrule || null;
    const startDate = isRegular
      ? input.startDate || computeDefaultStartDate()
      : input.startDate || null;
    const endDate = input.endDate || null;

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
        startDate,
        endDate,
        rrule,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    const amountVal = input.enteredAmount || input.monthlyAmount || "0.00";
    if (isRegular && rrule && startDate && parseFloat(amountVal) > 0) {
      await burstCategoryEvents(tx, {
        categoryId: cat.id,
        poolId: input.poolId,
        name: input.name,
        amount: amountVal,
        rrule,
        startDate,
        endDate,
        tenantId,
        appId,
        userId,
      });
    }

    return cat;
  });
}

