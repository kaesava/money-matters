import { incomeEvents, expenseEvents, DbOrTx } from "@money-matters/db";
import { inArray, and, eq } from "drizzle-orm";
import { z } from "zod";
import { BulkDeleteEventsCommand } from "@money-matters/types";

export async function bulkDeleteEventsCommand(
  input: z.infer<typeof BulkDeleteEventsCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  return await dbClient.transaction(async (tx) => {
    let incomeDeletedCount = 0;
    let expenseDeletedCount = 0;

    if (input.incomeEventIds.length > 0) {
      const deleted = await tx
        .update(incomeEvents)
        .set({
          archivedAt: new Date(),
          archivedBy: userId,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(incomeEvents.id, input.incomeEventIds),
            eq(incomeEvents.tenantId, tenantId),
            eq(incomeEvents.appId, appId)
          )
        )
        .returning();
      incomeDeletedCount = deleted.length;
    }

    if (input.expenseEventIds.length > 0) {
      const deleted = await tx
        .update(expenseEvents)
        .set({
          archivedAt: new Date(),
          archivedBy: userId,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(expenseEvents.id, input.expenseEventIds),
            eq(expenseEvents.tenantId, tenantId),
            eq(expenseEvents.appId, appId)
          )
        )
        .returning();
      expenseDeletedCount = deleted.length;
    }

    return {
      success: true,
      incomeDeletedCount,
      expenseDeletedCount,
      totalDeleted: incomeDeletedCount + expenseDeletedCount,
    };
  });
}
