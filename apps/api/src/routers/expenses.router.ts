import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { envelopes, expenseEvents } from "@money-matters/db";
import { and, eq, sql, inArray } from "drizzle-orm";
import { recordExpenseCommand } from "@money-matters/capability-transactions";
import { CreateOneOffExpenseCommand, RecordExpenseCommand } from "@money-matters/types";
import { z } from 'zod';
import { posthog } from '../lib/posthog.js';

export const expensesRouter = {
  listBillSchedules: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select({
          id: envelopes.id,
          name: envelopes.name,
          amount: sql<string>`COALESCE(${envelopes.enteredAmount}, ${envelopes.monthlyAmount}, '0.00')`,
          envelopeId: envelopes.id,
          envelopeName: envelopes.name,
          envelopeType: envelopes.envelopeType,
          rrule: envelopes.rrule,
          startDate: envelopes.startDate,
          endDate: envelopes.endDate,
        })
        .from(envelopes)
        .where(
          and(
            eq(envelopes.tenantId, ctx.tenantId!),
            eq(envelopes.appId, ctx.appId!),
            inArray(envelopes.envelopeType, ["SCHEDULED_BILL", "FLEXIBLE_BILL"]),
            sql`${envelopes.archivedAt} IS NULL`,
            sql`${envelopes.rrule} IS NOT NULL`
          )
        );
    }),

  createOneOffExpense: privateTenantProcedure
    .input(CreateOneOffExpenseCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);

      const [targetEnvelope] = await ctx.db
        .select({ id: envelopes.id })
        .from(envelopes)
        .where(
          and(
            eq(envelopes.id, input.envelopeId),
            eq(envelopes.tenantId, ctx.tenantId!),
            eq(envelopes.appId, ctx.appId!),
            sql`${envelopes.archivedAt} IS NULL`
          )
        )
        .limit(1);

      if (!targetEnvelope) {
        throw new Error("Target envelope not found or access unauthorized.");
      }

      const [insertedEvent] = await ctx.db
        .insert(expenseEvents)
        .values({
          envelopeId: input.envelopeId,
          name: input.name,
          expectedDate: input.expectedDate,
          expectedAmount: input.amount,
          note: input.note || null,
          isScheduled: false,
          status: "PENDING" as const,
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();

      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'one_off_expense_created',
          properties: {
            tenant_id: ctx.tenantId,
            envelope_id: input.envelopeId,
            amount: input.amount,
          },
        });
        await posthog.flush();
      }

      return insertedEvent;
    }),

  recordExpense: privateTenantProcedure
    .input(RecordExpenseCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const result = await recordExpenseCommand(
        input,
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        ctx.db
      );

      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'expense_recorded',
          properties: {
            tenant_id: ctx.tenantId,
            envelope_id: input.envelopeId,
            amount: input.amount,
          },
        });
        await posthog.flush();
      }

      return result;
    }),

  listExpenseEvents: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select({
          id: expenseEvents.id,
          name: expenseEvents.name,
          expectedAmount: expenseEvents.expectedAmount,
          expectedDate: expenseEvents.expectedDate,
          status: expenseEvents.status,
          envelopeId: expenseEvents.envelopeId,
          envelopeName: envelopes.name,
          isScheduled: expenseEvents.isScheduled,
        })
        .from(expenseEvents)
        .leftJoin(envelopes, eq(expenseEvents.envelopeId, envelopes.id))
        .where(
          and(
            eq(expenseEvents.tenantId, ctx.tenantId!),
            eq(expenseEvents.appId, ctx.appId!),
            sql`${expenseEvents.archivedAt} IS NULL`
          )
        );
    }),

  deleteExpenseEvent: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      await ctx.db
        .update(expenseEvents)
        .set({ archivedAt: new Date(), updatedBy: ctx.userId!, updatedAt: new Date() })
        .where(
          and(
            eq(expenseEvents.id, input.eventId),
            eq(expenseEvents.tenantId, ctx.tenantId!),
            eq(expenseEvents.appId, ctx.appId!)
          )
        );
      return { success: true };
    }),

  markExpensePaid: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        amount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).refine((val) => parseFloat(val) > 0, "Amount must be greater than 0").optional(),
        date: z.string().optional(),
        note: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [evt] = await ctx.db
        .select()
        .from(expenseEvents)
        .where(
          and(
            eq(expenseEvents.id, input.eventId),
            eq(expenseEvents.tenantId, ctx.tenantId!),
            eq(expenseEvents.appId, ctx.appId!)
          )
        );

      if (!evt) throw new Error("Expense event not found.");

      const paidAmount = input.amount || evt.expectedAmount;
      const paidDate = input.date || evt.expectedDate;

      await ctx.db
        .update(expenseEvents)
        .set({
          status: "CONFIRMED",
          actualAmount: paidAmount,
          actualDate: paidDate,
          note: input.note || evt.note,
          updatedAt: new Date(),
          updatedBy: ctx.userId!,
        })
        .where(eq(expenseEvents.id, input.eventId));

      if (evt.envelopeId) {
        const cleanUserNote = input.note?.trim();
        const transactionNote = cleanUserNote || evt.name;

        await recordExpenseCommand(
          {
            envelopeId: evt.envelopeId,
            flowType: "DEBIT",
            amount: paidAmount,
            source: "MANUAL",
            note: transactionNote,
            date: paidDate,
          },
          ctx.tenantId!,
          ctx.appId!,
          ctx.userId!,
          ctx.db
        );
      }

      return { success: true, message: "Bill marked as paid." };
    }),
};
