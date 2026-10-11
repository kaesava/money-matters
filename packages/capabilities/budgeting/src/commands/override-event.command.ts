import { incomeEvents, expenseEvents, incomeSources, envelopes, DbOrTx } from "@money-matters/db";
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
      const setPayload: Record<string, unknown> = {
        updatedBy: userId,
        updatedAt: new Date(),
      };

      const newAmount = input.expectedAmount || input.amount || input.actualAmount;
      if (newAmount) {
        setPayload.expectedAmount = newAmount;
        if (input.actualAmount || input.status === "CONFIRMED") {
          setPayload.actualAmount = input.actualAmount || newAmount;
        }
      }

      const newDate = input.expectedDate || (input as { actualDate?: string }).actualDate;
      if (newDate) {
        setPayload.expectedDate = newDate;
        if ((input as { actualDate?: string }).actualDate || input.status === "CONFIRMED") {
          setPayload.actualDate = (input as { actualDate?: string }).actualDate || newDate;
        }
      }

      if (input.status) setPayload.status = input.status;
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
      const setPayload: Record<string, unknown> = {
        updatedBy: userId,
        updatedAt: new Date(),
      };

      const newAmount = input.expectedAmount || input.amount || input.actualAmount;
      if (newAmount) {
        setPayload.expectedAmount = newAmount;
        if (input.actualAmount || input.status === "CONFIRMED") {
          setPayload.actualAmount = input.actualAmount || newAmount;
        }
      }

      const newDate = input.expectedDate || (input as { actualDate?: string }).actualDate;
      if (newDate) {
        setPayload.expectedDate = newDate;
        if ((input as { actualDate?: string }).actualDate || input.status === "CONFIRMED") {
          setPayload.actualDate = (input as { actualDate?: string }).actualDate || newDate;
        }
      }

      if (input.status) setPayload.status = input.status;
      if (input.name) setPayload.name = input.name;
      if (input.envelopeId) setPayload.envelopeId = input.envelopeId;
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

      if (input.updateSeries && updatedEvent.envelopeId && (input.amount || input.expectedAmount)) {
        const envPayload: Record<string, unknown> = {
          enteredAmount: input.expectedAmount || input.amount,
          monthlyAmount: input.expectedAmount || input.amount,
          updatedBy: userId,
          updatedAt: new Date(),
        };
        if (input.name) envPayload.name = input.name;

        await tx
          .update(envelopes)
          .set(envPayload)
          .where(
            and(
              eq(envelopes.id, updatedEvent.envelopeId),
              eq(envelopes.tenantId, tenantId),
              eq(envelopes.appId, appId)
            )
          );
      }

      return updatedEvent;
    }
  });
}
