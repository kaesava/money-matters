import { db, incomeEvents, expenseEvents, incomeSources, expenseSources } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { OverrideEventCommand } from "@money-matters/types";

export async function overrideEventCommand(
  input: z.infer<typeof OverrideEventCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  return await dbClient.transaction(async (tx) => {
    if (input.eventType === "INCOME") {
      const setPayload: Record<string, any> = {
        expectedAmount: input.amount,
        expectedDate: input.expectedDate,
        isOverridden: true,
        updatedBy: userId,
        updatedAt: new Date(),
      };
      if (input.note !== undefined) setPayload.note = input.note;

      const [updatedEvent] = await tx
        .update(incomeEvents)
        .set(setPayload)
        .where(
          and(
            eq(incomeEvents.id, input.eventId),
            eq(incomeEvents.tenantId, tenantId),
            eq(incomeEvents.appId, appId)
          )
        )
        .returning();

      if (!updatedEvent) throw new Error("Income event not found.");

      if (input.updateSeries && updatedEvent.incomeSourceId) {
        const sourcePayload: Record<string, any> = {
          amount: input.amount,
          updatedBy: userId,
          updatedAt: new Date(),
        };
        if (input.name) sourcePayload.name = input.name;

        await tx
          .update(incomeSources)
          .set(sourcePayload)
          .where(
            and(
              eq(incomeSources.id, updatedEvent.incomeSourceId),
              eq(incomeSources.tenantId, tenantId),
              eq(incomeSources.appId, appId)
            )
          );
      }

      return updatedEvent;
    } else {
      const setPayload: Record<string, any> = {
        expectedAmount: input.amount,
        expectedDate: input.expectedDate,
        isOverridden: true,
        updatedBy: userId,
        updatedAt: new Date(),
      };
      if (input.name) setPayload.name = input.name;
      if (input.categoryId) setPayload.categoryId = input.categoryId;
      if (input.note !== undefined) setPayload.note = input.note;

      const [updatedEvent] = await tx
        .update(expenseEvents)
        .set(setPayload)
        .where(
          and(
            eq(expenseEvents.id, input.eventId),
            eq(expenseEvents.tenantId, tenantId),
            eq(expenseEvents.appId, appId)
          )
        )
        .returning();

      if (!updatedEvent) throw new Error("Expense event not found.");

      if (input.updateSeries && updatedEvent.expenseSourceId) {
        const sourcePayload: Record<string, any> = {
          amount: input.amount,
          updatedBy: userId,
          updatedAt: new Date(),
        };
        if (input.name) sourcePayload.name = input.name;
        if (input.categoryId) sourcePayload.categoryId = input.categoryId;

        await tx
          .update(expenseSources)
          .set(sourcePayload)
          .where(
            and(
              eq(expenseSources.id, updatedEvent.expenseSourceId),
              eq(expenseSources.tenantId, tenantId),
              eq(expenseSources.appId, appId)
            )
          );
      }

      return updatedEvent;
    }
  });
}
