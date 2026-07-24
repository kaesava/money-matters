import { db, incomeEvents, expenseEvents } from "@money-matters/db";
import { inArray, and, eq } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { SkipEventsCommand } from "@money-matters/types";

export async function skipEventsCommand(
  input: z.infer<typeof SkipEventsCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  return await dbClient.transaction(async (tx) => {
    if (input.eventType === "INCOME") {
      const updated = await tx
        .update(incomeEvents)
        .set({
          status: "SKIPPED",
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(incomeEvents.id, input.eventIds),
            eq(incomeEvents.tenantId, tenantId),
            eq(incomeEvents.appId, appId)
          )
        )
        .returning();

      return { count: updated.length };
    } else {
      const updated = await tx
        .update(expenseEvents)
        .set({
          status: "SKIPPED",
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(expenseEvents.id, input.eventIds),
            eq(expenseEvents.tenantId, tenantId),
            eq(expenseEvents.appId, appId)
          )
        )
        .returning();

      return { count: updated.length };
    }
  });
}
