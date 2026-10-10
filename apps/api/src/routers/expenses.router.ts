import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { categories, expenseEvents, pools } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { recordExpenseCommand } from "@money-matters/capability-transactions";
import { CreateOneOffExpenseCommand } from "@money-matters/types";
import { z } from 'zod';
import { posthog } from '../lib/posthog.js';

const getAestDateString = (d: Date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);

export const expensesRouter = {
  listBillSchedules: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select({
          id: categories.id,
          name: categories.name,
          amount: sql<string>`COALESCE(${categories.enteredAmount}, ${categories.monthlyAmount}, '0.00')`,
          poolId: categories.poolId,
          poolName: pools.name,
          categoryId: categories.id,
          categoryName: categories.name,
          rrule: categories.rrule,
          startDate: categories.startDate,
          endDate: categories.endDate,
        })
        .from(categories)
        .innerJoin(pools, eq(categories.poolId, pools.id))
        .where(
          and(
            eq(categories.tenantId, ctx.tenantId!),
            eq(categories.appId, ctx.appId!),
            eq(pools.poolType, "REGULAR"),
            sql`${categories.archivedAt} IS NULL`,
            sql`${categories.rrule} IS NOT NULL`
          )
        );
    }),

  createOneOffExpense: privateTenantProcedure
    .input(CreateOneOffExpenseCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);

      const [targetPool] = await ctx.db
        .select({ id: pools.id })
        .from(pools)
        .where(
          and(
            eq(pools.id, input.poolId),
            eq(pools.tenantId, ctx.tenantId!),
            eq(pools.appId, ctx.appId!),
            sql`${pools.archivedAt} IS NULL`
          )
        )
        .limit(1);

      if (!targetPool) {
        throw new Error("Target pool not found or access unauthorized.");
      }

      const [insertedEvent] = await ctx.db
        .insert(expenseEvents)
        .values({
          poolId: input.poolId,
          categoryId: input.categoryId || null,
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
            pool_id: input.poolId,
            category_id: input.categoryId,
            amount: input.amount,
          },
        });
        await posthog.flush();
      }

      return insertedEvent;
    }),

  recordExpense: privateTenantProcedure
    .input(
      z.object({
        poolId: z.string().uuid(),
        categoryId: z.string().uuid().optional(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        note: z.string().optional(),
        date: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const result = await recordExpenseCommand(
        {
          poolId: input.poolId,
          categoryId: input.categoryId,
          flowType: "DEBIT",
          amount: input.amount,
          source: "MANUAL",
          note: input.note,
          date: input.date,
        },
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
            pool_id: input.poolId,
            category_id: input.categoryId,
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
          poolId: expenseEvents.poolId,
          poolName: pools.name,
          categoryId: expenseEvents.categoryId,
          categoryName: categories.name,
          isScheduled: expenseEvents.isScheduled,
        })
        .from(expenseEvents)
        .leftJoin(pools, eq(expenseEvents.poolId, pools.id))
        .leftJoin(categories, eq(expenseEvents.categoryId, categories.id))
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

  skipExpenseEvent: privateTenantProcedure
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

      if (evt.poolId) {
        const cleanUserNote = input.note?.trim();
        const transactionNote = cleanUserNote || evt.name;

        await recordExpenseCommand(
          {
            poolId: evt.poolId,
            categoryId: evt.categoryId || undefined,
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
