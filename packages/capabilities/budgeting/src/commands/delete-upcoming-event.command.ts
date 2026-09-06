import { incomeEvents, expenseEvents, DbOrTx } from "@money-matters/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { DeleteUpcomingEventCommand } from "@money-matters/types";

export async function deleteUpcomingEventCommand(
  input: z.infer<typeof DeleteUpcomingEventCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  return await dbClient.transaction(async (tx) => {
    if (input.eventType === "INCOME") {
      const [deleted] = await tx
        .update(incomeEvents)
        .set({
          archivedAt: new Date(),
          archivedBy: userId,
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
      if (!deleted) throw new Error("Income event not found or unauthorized.");
      return { success: true, id: deleted.id };
    } else {
      const [deleted] = await tx
        .update(expenseEvents)
        .set({
          archivedAt: new Date(),
          archivedBy: userId,
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
      if (!deleted) throw new Error("Expense event not found or unauthorized.");
      return { success: true, id: deleted.id };
    }
  });
}
