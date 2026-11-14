import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { envelopes, expenseEvents, bankAccounts } from "@money-matters/db";
import { and, eq, sql, inArray } from "drizzle-orm";
import { recordExpenseCommand, markExpensePaidCommand } from "@money-matters/capability-transactions";
import { CreateOneOffExpenseCommand, MarkExpensePaidCommand } from "@money-matters/types";
import { z } from 'zod';
import { posthog } from '../lib/posthog.js';

export const expensesRouter = {
  listBillSchedules: privateTenantProcedure
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select({
          id: envelopes.id,
          name: envelopes.name,
          amount: sql<string>`COALESCE(${envelopes.enteredAmount}, ${envelopes.monthlyAmount}, '0.00')`,
          envelopeId: envelopes.id,
          envelopeName: envelopes.name,
          envelopeType: envelopes.envelopeType,
          budgetFrequency: envelopes.budgetFrequency,
          isPrivate: envelopes.isPrivate,
          userId: envelopes.userId,
          isPriority: envelopes.isPriority,
          bankAccountId: envelopes.bankAccountId,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
          rrule: envelopes.rrule,
          startDate: envelopes.startDate,
          endDate: envelopes.endDate,
          generateEvents: envelopes.generateEvents,
          hasScheduledEvents: sql<boolean>`EXISTS (
            SELECT 1 FROM ${expenseEvents}
            WHERE ${expenseEvents.envelopeId} = ${envelopes.id}
              AND ${expenseEvents.isScheduled} = true
              AND ${expenseEvents.status} = 'PENDING'
              AND ${expenseEvents.archivedAt} IS NULL
              AND ${expenseEvents.tenantId} = ${ctx.tenantId!}
              AND ${expenseEvents.appId} = ${ctx.appId!}
          )`.as("has_scheduled_events"),
        })
        .from(envelopes)
        .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
        .where(
          and(
            eq(envelopes.tenantId, ctx.tenantId!),
            eq(envelopes.appId, ctx.appId!),
            eq(envelopes.envelopeType, "BILL"),
            eq(envelopes.fundingMode, "RECURRING"),
            sql`${envelopes.archivedAt} IS NULL`,
            sql`CAST(COALESCE(${envelopes.enteredAmount}, ${envelopes.monthlyAmount}, '0.00') AS numeric) > 0`
          )
        );

      return rows.filter((r) => {
        if (r.isPrivate && r.userId !== ctx.userId) return false;
        if (r.bankAccountIsPrivate && r.bankAccountUserId !== ctx.userId) return false;
        return true;
      });
    }),

  createOneOffExpense: privateTenantProcedure
    .input(CreateOneOffExpenseCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);

      const [targetEnvelope] = await ctx.db
        .select({
          id: envelopes.id,
          isPrivate: envelopes.isPrivate,
          userId: envelopes.userId,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
        })
        .from(envelopes)
        .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
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

      if (
        (targetEnvelope.isPrivate && targetEnvelope.userId !== ctx.userId) ||
        (targetEnvelope.bankAccountIsPrivate && targetEnvelope.bankAccountUserId !== ctx.userId)
      ) {
        throw new Error("Unauthorized: Cannot create expenses against partner's private envelope.");
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
          },
        });
        await posthog.flush();
      }

      return insertedEvent;
    }),

  listExpenseEvents: privateTenantProcedure
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select({
          id: expenseEvents.id,
          name: expenseEvents.name,
          expectedAmount: expenseEvents.expectedAmount,
          expectedDate: expenseEvents.expectedDate,
          status: expenseEvents.status,
          envelopeId: expenseEvents.envelopeId,
          envelopeName: envelopes.name,
          isScheduled: expenseEvents.isScheduled,
          envelopeIsPrivate: envelopes.isPrivate,
          envelopeUserId: envelopes.userId,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
        })
        .from(expenseEvents)
        .leftJoin(envelopes, eq(expenseEvents.envelopeId, envelopes.id))
        .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
        .where(
          and(
            eq(expenseEvents.tenantId, ctx.tenantId!),
            eq(expenseEvents.appId, ctx.appId!),
            sql`${expenseEvents.archivedAt} IS NULL`
          )
        );

      return rows.filter((r) => {
        if (r.envelopeIsPrivate && r.envelopeUserId !== ctx.userId) return false;
        if (r.bankAccountIsPrivate && r.bankAccountUserId !== ctx.userId) return false;
        return true;
      });
    }),

  deleteExpenseEvent: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [evt] = await ctx.db
        .select({
          id: expenseEvents.id,
          envelopeIsPrivate: envelopes.isPrivate,
          envelopeUserId: envelopes.userId,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
        })
        .from(expenseEvents)
        .leftJoin(envelopes, eq(expenseEvents.envelopeId, envelopes.id))
        .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
        .where(
          and(
            eq(expenseEvents.id, input.eventId),
            eq(expenseEvents.tenantId, ctx.tenantId!),
            eq(expenseEvents.appId, ctx.appId!),
            sql`${expenseEvents.archivedAt} IS NULL`
          )
        );

      if (!evt) throw new Error("Expense event not found.");
      if (
        (evt.envelopeIsPrivate && evt.envelopeUserId !== ctx.userId) ||
        (evt.bankAccountIsPrivate && evt.bankAccountUserId !== ctx.userId)
      ) {
        throw new Error("Expense event not found.");
      }

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
    .input(MarkExpensePaidCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return markExpensePaidCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),
};

