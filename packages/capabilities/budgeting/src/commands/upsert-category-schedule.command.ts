import { db, categorySchedules } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { CreateCategoryScheduleCommand } from "@money-matters/types";

export async function upsertCategoryScheduleCommand(
  input: z.infer<typeof CreateCategoryScheduleCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  return await dbClient.transaction(async (tx) => {
    // Check if a schedule already exists for this category
    const [existing] = await tx
      .select()
      .from(categorySchedules)
      .where(
        and(
          eq(categorySchedules.categoryId, input.categoryId),
          eq(categorySchedules.tenantId, tenantId),
          eq(categorySchedules.appId, appId)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await tx
        .update(categorySchedules)
        .set({
          targetAmount: input.targetAmount,
          targetDate: input.targetDate || null,
          dueDate: input.dueDate || null,
          rrule: input.rrule || null,
          startDate: input.startDate || null,
          endDate: input.endDate || null,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(categorySchedules.id, existing.id))
        .returning();
      return updated;
    }

    const [inserted] = await tx
      .insert(categorySchedules)
      .values({
        categoryId: input.categoryId,
        targetAmount: input.targetAmount,
        targetDate: input.targetDate || null,
        dueDate: input.dueDate || null,
        rrule: input.rrule || null,
        startDate: input.startDate || null,
        endDate: input.endDate || null,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return inserted;
  });
}
