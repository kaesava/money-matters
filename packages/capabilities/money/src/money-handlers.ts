import { z } from "zod";
import { categories, categorySchedules, incomeSources, incomeSourceSchedules, incomeEvents } from "@money-matters/db";
import { 
  CreateCategoryCommand, 
  UpdateCategoryCommand,
  CreateCategoryScheduleCommand,
  CreateIncomeSourceCommand,
  CreateIncomeSourceScheduleCommand,
  CreateIncomeEventCommand
} from "@money-matters/types";
import { eq, and } from "drizzle-orm";

export function createCategoryHandler(db: any) {
  return async (
    input: z.infer<typeof CreateCategoryCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [category] = await db
      .insert(categories)
      .values({
        householdId: tenantId,
        name: input.name,
        type: input.type,
        priorityRank: input.priorityRank || null,
        isDefaultExcess: input.isDefaultExcess,
        icon: input.icon || null,
        colour: input.colour || null,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return category;
  };
}

export function updateCategoryHandler(db: any) {
  return async (
    categoryId: string,
    input: z.infer<typeof UpdateCategoryCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [updated] = await db
      .update(categories)
      .set({
        ...input,
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

    if (!updated) {
      throw new Error("Category not found or access unauthorized.");
    }

    return updated;
  };
}

export function createCategoryScheduleHandler(db: any) {
  return async (
    input: z.infer<typeof CreateCategoryScheduleCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [schedule] = await db
      .insert(categorySchedules)
      .values({
        categoryId: input.categoryId,
        targetAmount: input.targetAmount,
        rrule: input.rrule || null,
        dueDate: input.dueDate || null,
        nextDueDate: input.dueDate || null,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return schedule;
  };
}

export function createIncomeSourceHandler(db: any) {
  return async (
    input: z.infer<typeof CreateIncomeSourceCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [source] = await db
      .insert(incomeSources)
      .values({
        householdId: tenantId,
        name: input.name,
        type: input.type,
        amount: input.amount,
        receivingAccountId: input.receivingAccountId || null,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return source;
  };
}

export function createIncomeSourceScheduleHandler(db: any) {
  return async (
    input: z.infer<typeof CreateIncomeSourceScheduleCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [schedule] = await db
      .insert(incomeSourceSchedules)
      .values({
        incomeSourceId: input.incomeSourceId,
        rrule: input.rrule,
        startDate: input.startDate,
        endDate: input.endDate || null,
        occurrenceCount: input.occurrenceCount || null,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return schedule;
  };
}

export function createIncomeEventHandler(db: any) {
  return async (
    input: z.infer<typeof CreateIncomeEventCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [event] = await db
      .insert(incomeEvents)
      .values({
        incomeSourceId: input.incomeSourceId,
        expectedDate: input.expectedDate,
        expectedAmount: input.expectedAmount,
        status: "UPCOMING" as const,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return event;
  };
}
