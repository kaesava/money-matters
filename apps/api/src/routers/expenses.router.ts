import { tenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { expenseSources, categories, expenseEvents, pools } from "@money-matters/db";
import { and, eq, sql, inArray } from "drizzle-orm";
import { generateBurstDates } from "@money-matters/capability-budgeting";
import { recordExpenseCommand } from "@money-matters/capability-transactions";
import { z } from 'zod';
import { posthog } from '../lib/posthog.js';

export const expensesRouter = {
  listExpenseSources: tenantProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select({
          id: expenseSources.id,
          name: expenseSources.name,
          amount: expenseSources.amount,
          poolId: expenseSources.poolId,
          poolName: pools.name,
          categoryId: expenseSources.categoryId,
          categoryName: categories.name,
          rrule: expenseSources.rrule,
          startDate: expenseSources.startDate,
          endDate: expenseSources.endDate,
        })
        .from(expenseSources)
        .leftJoin(pools, eq(expenseSources.poolId, pools.id))
        .leftJoin(categories, eq(expenseSources.categoryId, categories.id))
        .where(
          and(
            eq(expenseSources.tenantId, ctx.tenantId!),
            eq(expenseSources.appId, ctx.appId!),
            sql`${expenseSources.archivedAt} IS NULL`
          )
        );
    }),

  createExpenseSource: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        poolId: z.string().uuid(),
        categoryId: z.string().uuid().optional(),
        isRecurring: z.boolean().default(true),
        startDate: z.string().optional(),
        endDate: z.string().nullable().optional(),
        frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      let rrule: string | null = null;
      if (input.isRecurring && input.startDate) {
        if (input.frequency === "WEEKLY") rrule = "FREQ=WEEKLY";
        else if (input.frequency === "FORTNIGHTLY") rrule = "FREQ=WEEKLY;INTERVAL=2";
        else if (input.frequency === "ANNUALLY") rrule = "FREQ=YEARLY";
        else rrule = "FREQ=MONTHLY";
      }

      const [source] = await ctx.db
        .insert(expenseSources)
        .values({
          name: input.name,
          amount: input.amount,
          poolId: input.poolId,
          categoryId: input.categoryId || null,
          rrule,
          startDate: input.startDate || null,
          endDate: input.endDate || null,
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();

      if (input.isRecurring && input.startDate && rrule) {
        const dates = generateBurstDates(rrule, input.startDate, input.endDate, 12);
        if (dates.length > 0) {
          await ctx.db.insert(expenseEvents).values(
            dates.map((d) => ({
              expenseSourceId: source.id,
              poolId: input.poolId,
              categoryId: input.categoryId || null,
              name: input.name,
              expectedDate: d.toISOString().split("T")[0],
              expectedAmount: input.amount,
              status: "UPCOMING" as const,
              tenantId: ctx.tenantId!,
              appId: ctx.appId!,
              createdBy: ctx.userId!,
              updatedBy: ctx.userId!,
            }))
          );
        }
      } else if (input.startDate) {
        await ctx.db.insert(expenseEvents).values({
          expenseSourceId: source.id,
          poolId: input.poolId,
          categoryId: input.categoryId || null,
          name: input.name,
          expectedDate: input.startDate,
          expectedAmount: input.amount,
          status: "UPCOMING",
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        });
      }

      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'expense_source_created',
          properties: {
            tenant_id: ctx.tenantId,
            pool_id: input.poolId,
            category_id: input.categoryId,
            amount: input.amount,
            is_recurring: input.isRecurring,
          },
        });
        await posthog.flush();
      }

      return source;
    }),

  recordExpense: tenantProcedure
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

  listExpenseEvents: tenantProcedure
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
          expenseSourceId: expenseEvents.expenseSourceId,
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

  reburstExpenseSource: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [source] = await ctx.db
        .select()
        .from(expenseSources)
        .where(
          and(
            eq(expenseSources.id, input.id),
            eq(expenseSources.tenantId, ctx.tenantId!),
            eq(expenseSources.appId, ctx.appId!),
            sql`${expenseSources.archivedAt} IS NULL`
          )
        );

      if (!source) throw new Error("Expense source not found.");
      if (!source.rrule) return { count: 0 };

      const unperformedEvents = await ctx.db
        .select()
        .from(expenseEvents)
        .where(
          and(
            eq(expenseEvents.expenseSourceId, source.id),
            eq(expenseEvents.status, "UPCOMING")
          )
        );

      if (unperformedEvents.length > 0) {
        await ctx.db
          .delete(expenseEvents)
          .where(inArray(expenseEvents.id, unperformedEvents.map((e) => e.id)));
      }

      const startDate = source.startDate || new Date().toISOString().split("T")[0];
      const dates = generateBurstDates(source.rrule, startDate, source.endDate, 12);
      if (dates.length > 0) {
        await ctx.db.insert(expenseEvents).values(
          dates.map((d) => ({
            expenseSourceId: source.id,
            poolId: source.poolId,
            categoryId: source.categoryId,
            name: source.name,
            expectedDate: d.toISOString().split("T")[0],
            expectedAmount: source.amount,
            status: "UPCOMING" as const,
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            createdBy: ctx.userId!,
            updatedBy: ctx.userId!,
          }))
        );
      }

      return { count: dates.length };
    }),
};
