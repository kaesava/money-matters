import { tenantProcedure } from '../trpc/trpc.js';
import { expenseSources, categories, expenseSourceSchedules, expenseEvents } from "@money-matters/db";
import { and, eq, sql, asc } from "drizzle-orm";
import { generateBurstDates } from "@money-matters/capability-budgeting";
import { recordExpenseCommand } from "@money-matters/capability-transactions";
import { z } from 'zod';

export const expensesRouter = {
  listExpenseSources: tenantProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select({
          id: expenseSources.id,
          name: expenseSources.name,
          amount: expenseSources.amount,
          categoryId: expenseSources.categoryId,
          categoryName: categories.name,
          scheduleId: expenseSourceSchedules.id,
          rrule: expenseSourceSchedules.rrule,
          startDate: expenseSourceSchedules.startDate,
          endDate: expenseSourceSchedules.endDate,
        })
        .from(expenseSources)
        .leftJoin(categories, eq(expenseSources.categoryId, categories.id))
        .leftJoin(expenseSourceSchedules, eq(expenseSources.id, expenseSourceSchedules.expenseSourceId))
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
        categoryId: z.string().uuid(),
        isRecurring: z.boolean().default(true),
        startDate: z.string().optional(),
        frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      const [source] = await ctx.db
        .insert(expenseSources)
        .values({
          name: input.name,
          amount: input.amount,
          categoryId: input.categoryId,
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();

      if (input.isRecurring && input.startDate) {
        let rrule = "FREQ=MONTHLY";
        if (input.frequency === "WEEKLY") rrule = "FREQ=WEEKLY";
        else if (input.frequency === "FORTNIGHTLY") rrule = "FREQ=WEEKLY;INTERVAL=2";
        else if (input.frequency === "ANNUALLY") rrule = "FREQ=YEARLY";

        await ctx.db.insert(expenseSourceSchedules).values({
          expenseSourceId: source.id,
          rrule,
          startDate: input.startDate,
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        });

        const dates = generateBurstDates(rrule, input.startDate, null, 12);
        for (const d of dates) {
          await ctx.db.insert(expenseEvents).values({
            expenseSourceId: source.id,
            categoryId: input.categoryId,
            name: input.name,
            expectedDate: d.toISOString().split("T")[0],
            expectedAmount: input.amount,
            status: "UPCOMING",
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            createdBy: ctx.userId!,
            updatedBy: ctx.userId!,
          });
        }
      } else if (input.startDate) {
        await ctx.db.insert(expenseEvents).values({
          expenseSourceId: source.id,
          categoryId: input.categoryId,
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

      return source;
    }),

  updateExpenseSource: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          name: z.string().min(1).optional(),
          amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
          categoryId: z.string().uuid().optional(),
        }).strict(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      const [updated] = await ctx.db
        .update(expenseSources)
        .set({
          name: input.data.name,
          amount: input.data.amount,
          categoryId: input.data.categoryId,
          updatedBy: ctx.userId!,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(expenseSources.id, input.id),
            eq(expenseSources.tenantId, ctx.tenantId!),
            eq(expenseSources.appId, ctx.appId!),
            sql`${expenseSources.archivedAt} IS NULL`
          )
        )
        .returning();
      if (!updated) throw new Error("Expense source not found.");
      return updated;
    }),

  archiveExpenseSource: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      const pendingEvents = await ctx.db
        .select()
        .from(expenseEvents)
        .where(
          and(
            eq(expenseEvents.expenseSourceId, input.id),
            eq(expenseEvents.status, "UPCOMING"),
            sql`${expenseEvents.archivedAt} IS NULL`
          )
        );

      if (pendingEvents.length > 0) {
        throw new Error("Cannot archive an expense source that has upcoming expense events scheduled.");
      }

      await ctx.db
        .update(expenseSources)
        .set({
          archivedAt: new Date(),
          updatedBy: ctx.userId!,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(expenseSources.id, input.id),
            eq(expenseSources.tenantId, ctx.tenantId!),
            eq(expenseSources.appId, ctx.appId!),
            sql`${expenseSources.archivedAt} IS NULL`
          )
        );
      return { success: true };
    }),

  listExpenseEvents: tenantProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select({
          id: expenseEvents.id,
          name: expenseEvents.name,
          expectedDate: expenseEvents.expectedDate,
          expectedAmount: expenseEvents.expectedAmount,
          actualAmount: expenseEvents.actualAmount,
          isOverridden: expenseEvents.isOverridden,
          paymentMethod: expenseEvents.paymentMethod,
          note: expenseEvents.note,
          status: expenseEvents.status,
          categoryId: expenseEvents.categoryId,
          categoryName: categories.name,
          expenseSourceId: expenseEvents.expenseSourceId,
        })
        .from(expenseEvents)
        .leftJoin(categories, eq(expenseEvents.categoryId, categories.id))
        .where(
          and(
            eq(expenseEvents.tenantId, ctx.tenantId!),
            eq(expenseEvents.appId, ctx.appId!),
            sql`${expenseEvents.archivedAt} IS NULL`
          )
        )
        .orderBy(asc(expenseEvents.expectedDate));
    }),

  createExpenseEvent: tenantProcedure
    .input(
      z.object({
        categoryId: z.string().uuid().optional(),
        name: z.string().min(1),
        expectedDate: z.string(),
        expectedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        note: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      const [evt] = await ctx.db
        .insert(expenseEvents)
        .values({
          categoryId: input.categoryId || null,
          name: input.name,
          expectedDate: input.expectedDate,
          expectedAmount: input.expectedAmount,
          note: input.note || null,
          status: "UPCOMING",
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();
      return evt;
    }),

  markExpensePaid: tenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        actualAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        note: z.string().optional(),
        recordedAt: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
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

      const amountToPay = input.actualAmount || evt.expectedAmount;

      if (evt.categoryId) {
        await recordExpenseCommand(
          {
            categoryId: evt.categoryId,
            amount: amountToPay,
            flowType: "DEBIT",
            source: "MANUAL",
            note: input.note || evt.note || `Paid expense: ${evt.name}`,
            recordedAt: input.recordedAt || new Date().toISOString(),
          },
          ctx.tenantId!,
          ctx.appId!,
          ctx.userId!,
          ctx.db
        );
      }

      await ctx.db
        .update(expenseEvents)
        .set({
          status: "PAID",
          actualAmount: amountToPay,
          updatedAt: new Date(),
          updatedBy: ctx.userId!,
        })
        .where(eq(expenseEvents.id, input.eventId));

      return { success: true, message: "Expense marked paid and moved to Transactions." };
    }),
};
