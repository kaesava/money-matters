import { incomeEvents, expenseEvents, incomeSources, expenseSources, DbOrTx } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { OverrideEventCommand } from "@money-matters/types";

export async function overrideEventCommand(
  input: z.infer<typeof OverrideEventCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {


  if (input.eventType === "EXPENSE" && (input.status as string) === "CONFIRMED") {
    throw new Error("Expense events cannot be set to CONFIRMED status.");
  }

  return await dbClient.transaction(async (tx) => {


    if (input.eventType === "INCOME") {
      const [existingEvt] = await tx
        .select({
          incomeSourceId: incomeEvents.incomeSourceId,
          expectedDate: incomeEvents.expectedDate,
          expectedAmount: incomeEvents.expectedAmount,
        })
        .from(incomeEvents)
        .where(
          and(
            eq(incomeEvents.id, input.eventId),
            eq(incomeEvents.tenantId, tenantId),
            eq(incomeEvents.appId, appId)
          )
        )
        .limit(1);

      const isScheduled = Boolean(existingEvt?.incomeSourceId);
      const setPayload: Record<string, unknown> = {
        isOverridden: true,
        updatedBy: userId,
        updatedAt: new Date(),
      };

      const newAmount = input.actualAmount || input.expectedAmount || input.amount;
      if (newAmount) {
        setPayload.actualAmount = newAmount;
        if (!isScheduled || input.updateSeries) {
          setPayload.expectedAmount = newAmount;
        }
      }

      const newDate = (input as { actualDate?: string }).actualDate || input.expectedDate;
      if (newDate) {
        setPayload.actualDate = newDate;
        if (!isScheduled) {
          setPayload.expectedDate = newDate;
        }
      }

      if (input.status) {
        setPayload.status = input.status;
      }
      if (input.name) setPayload.name = input.name;
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

      if (input.updateSeries && updatedEvent.incomeSourceId && (input.amount || input.expectedAmount)) {
        const sourcePayload: Record<string, unknown> = {
          amount: input.expectedAmount || input.amount,
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
      const [existingEvt] = await tx
        .select({
          expenseSourceId: expenseEvents.expenseSourceId,
          expectedDate: expenseEvents.expectedDate,
          expectedAmount: expenseEvents.expectedAmount,
        })
        .from(expenseEvents)
        .where(
          and(
            eq(expenseEvents.id, input.eventId),
            eq(expenseEvents.tenantId, tenantId),
            eq(expenseEvents.appId, appId)
          )
        )
        .limit(1);

      const isScheduled = Boolean(existingEvt?.expenseSourceId);
      const setPayload: Record<string, unknown> = {
        isOverridden: true,
        updatedBy: userId,
        updatedAt: new Date(),
      };

      const newAmount = input.actualAmount || input.expectedAmount || input.amount;
      if (newAmount) {
        setPayload.actualAmount = newAmount;
        if (!isScheduled || input.updateSeries) {
          setPayload.expectedAmount = newAmount;
        }
      }

      const newDate = (input as { actualDate?: string }).actualDate || input.expectedDate;
      if (newDate) {
        setPayload.actualDate = newDate;
        if (!isScheduled) {
          setPayload.expectedDate = newDate;
        }
      }

      if (input.status) {
        setPayload.status = input.status;
      }
      if (input.name) setPayload.name = input.name;
      if (input.poolId) setPayload.poolId = input.poolId;
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

      if (input.updateSeries && updatedEvent.expenseSourceId && (input.amount || input.expectedAmount)) {
        const sourcePayload: Record<string, unknown> = {
          amount: input.expectedAmount || input.amount,
          updatedBy: userId,
          updatedAt: new Date(),
        };
        if (input.name) sourcePayload.name = input.name;
        if (input.poolId) sourcePayload.poolId = input.poolId;
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
