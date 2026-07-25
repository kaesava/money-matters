import { db, incomeEvents, expenseEvents } from "@money-matters/db";
import { and, eq } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { DeleteUpcomingEventCommand } from "@money-matters/types";

export async function deleteUpcomingEventCommand(
  input: z.infer<typeof DeleteUpcomingEventCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  return await dbClient.transaction(async (tx) => {
    if (input.eventType === "INCOME") {
      const [deleted] = await tx
        .delete(incomeEvents)
        .where(
          and(
            eq(incomeEvents.id, input.eventId),
            eq(incomeEvents.tenantId, tenantId),
            eq(incomeEvents.appId, appId)
          )
        )
        .returning();
      if (!deleted) throw new Error("Income event not found or unauthorized.");
      return { success: true, id: deleted.id };
    } else {
      const [deleted] = await tx
        .delete(expenseEvents)
        .where(
          and(
            eq(expenseEvents.id, input.eventId),
            eq(expenseEvents.tenantId, tenantId),
            eq(expenseEvents.appId, appId)
          )
        )
        .returning();
      if (!deleted) throw new Error("Expense event not found or unauthorized.");
      return { success: true, id: deleted.id };
    }
  });
}
