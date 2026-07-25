import { db, incomeEvents, expenseEvents } from "@money-matters/db";
import { inArray, and, eq } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { BulkDeleteEventsCommand } from "@money-matters/types";

export async function bulkDeleteEventsCommand(
  input: z.infer<typeof BulkDeleteEventsCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  return await dbClient.transaction(async (tx) => {
    let incomeDeletedCount = 0;
    let expenseDeletedCount = 0;

    if (input.incomeEventIds.length > 0) {
      const deleted = await tx
        .delete(incomeEvents)
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
        .delete(expenseEvents)
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
