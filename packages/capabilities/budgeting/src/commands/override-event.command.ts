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
      const [updatedEvent] = await tx
        .update(incomeEvents)
        .set({
          expectedAmount: input.amount,
          expectedDate: input.expectedDate,
          isOverridden: true,
          updatedBy: userId,
          updatedAt: new Date(),
        })
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
        await tx
          .update(incomeSources)
          .set({
            amount: input.amount,
            updatedBy: userId,
            updatedAt: new Date(),
          })
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
      const [updatedEvent] = await tx
        .update(expenseEvents)
        .set({
          expectedAmount: input.amount,
          expectedDate: input.expectedDate,
          isOverridden: true,
          updatedBy: userId,
          updatedAt: new Date(),
        })
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
        await tx
          .update(expenseSources)
          .set({
            amount: input.amount,
            updatedBy: userId,
            updatedAt: new Date(),
          })
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
