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
          isRecurring: z.boolean().optional(),
          startDate: z.string().optional(),
          frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
        }).strict(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
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

      const [existingSchedule] = await ctx.db
        .select()
        .from(expenseSourceSchedules)
        .where(eq(expenseSourceSchedules.expenseSourceId, source.id));

      const events = await ctx.db
        .select()
        .from(expenseEvents)
        .where(eq(expenseEvents.expenseSourceId, source.id));

      const paidEvents = events.filter((e) => e.status !== "UPCOMING");
      const unperformedEvents = events.filter((e) => e.status === "UPCOMING");

      const newName = input.data.name ?? source.name;
      const newAmount = input.data.amount ?? source.amount;
      const newCategoryId = input.data.categoryId ?? source.categoryId;

      const wasRecurring = !!existingSchedule;
      const isRecurring = input.data.isRecurring !== undefined ? input.data.isRecurring : wasRecurring;

      let newStartDate = input.data.startDate;
      if (!newStartDate) {
        if (existingSchedule?.startDate) newStartDate = existingSchedule.startDate;
        else if (unperformedEvents.length > 0 && unperformedEvents[0].expectedDate) newStartDate = unperformedEvents[0].expectedDate;
        else newStartDate = new Date().toISOString().split("T")[0];
      }

      const newFreq = input.data.frequency;
      let rrule = existingSchedule?.rrule || "FREQ=MONTHLY";
      if (newFreq === "WEEKLY") rrule = "FREQ=WEEKLY";
      else if (newFreq === "FORTNIGHTLY") rrule = "FREQ=WEEKLY;INTERVAL=2";
      else if (newFreq === "MONTHLY") rrule = "FREQ=MONTHLY";
      else if (newFreq === "ANNUALLY") rrule = "FREQ=YEARLY";

      const typeChanged = wasRecurring !== isRecurring;
      const scheduleOrFreqChanged = isRecurring && (
        typeChanged ||
        (input.data.startDate && input.data.startDate !== existingSchedule?.startDate) ||
        (newFreq && rrule !== existingSchedule?.rrule)
      );

      if (typeChanged || scheduleOrFreqChanged) {
        // Delete all unperformed future events
        for (const evt of unperformedEvents) {
          await ctx.db.delete(expenseEvents).where(eq(expenseEvents.id, evt.id));
        }

        if (isRecurring) {
          if (existingSchedule) {
            await ctx.db
              .update(expenseSourceSchedules)
              .set({
                rrule,
                startDate: newStartDate,
                updatedAt: new Date(),
                updatedBy: ctx.userId!,
              })
              .where(eq(expenseSourceSchedules.id, existingSchedule.id));
          } else {
            await ctx.db.insert(expenseSourceSchedules).values({
              expenseSourceId: source.id,
              rrule,
              startDate: newStartDate,
              tenantId: ctx.tenantId!,
              appId: ctx.appId!,
              createdBy: ctx.userId!,
              updatedBy: ctx.userId!,
            });
          }

          const dates = generateBurstDates(rrule, newStartDate, null, 12);
          for (const d of dates) {
            await ctx.db.insert(expenseEvents).values({
              expenseSourceId: source.id,
              categoryId: newCategoryId,
              name: newName,
              expectedDate: d.toISOString().split("T")[0],
              expectedAmount: newAmount,
              status: "UPCOMING",
              tenantId: ctx.tenantId!,
              appId: ctx.appId!,
              createdBy: ctx.userId!,
              updatedBy: ctx.userId!,
            });
          }
        } else {
          if (existingSchedule) {
            await ctx.db.delete(expenseSourceSchedules).where(eq(expenseSourceSchedules.id, existingSchedule.id));
          }

          await ctx.db.insert(expenseEvents).values({
            expenseSourceId: source.id,
            categoryId: newCategoryId,
            name: newName,
            expectedDate: newStartDate,
            expectedAmount: newAmount,
            status: "UPCOMING",
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            createdBy: ctx.userId!,
            updatedBy: ctx.userId!,
          });
        }
      } else {
        // Schedule structure didn't change: update unperformed events
        for (const evt of unperformedEvents) {
          await ctx.db
            .update(expenseEvents)
            .set({
              name: newName,
              categoryId: newCategoryId,
              expectedAmount: newAmount,
              expectedDate: (!isRecurring && input.data.startDate) ? input.data.startDate : evt.expectedDate,
              updatedAt: new Date(),
              updatedBy: ctx.userId!,
            })
            .where(eq(expenseEvents.id, evt.id));
        }
      }

      const [updated] = await ctx.db
        .update(expenseSources)
        .set({
          name: newName,
          amount: newAmount,
          categoryId: newCategoryId,
          updatedAt: new Date(),
          updatedBy: ctx.userId!,
        })
        .where(eq(expenseSources.id, source.id))
        .returning();

      return {
        updated,
        hasPaidHistory: paidEvents.length > 0,
        unperformedUpdatedCount: unperformedEvents.length,
      };
    }),

  archiveExpenseSource: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      const events = await ctx.db
        .select()
        .from(expenseEvents)
        .where(eq(expenseEvents.expenseSourceId, input.id));

      const paidEvents = events.filter((e) => e.status !== "UPCOMING");
      const unperformedEvents = events.filter((e) => e.status === "UPCOMING");

      // Delete unperformed future events
      for (const evt of unperformedEvents) {
        await ctx.db.delete(expenseEvents).where(eq(expenseEvents.id, evt.id));
      }

      const [archived] = await ctx.db
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
        )
        .returning();

      if (!archived) throw new Error("Expense source not found.");

      return {
        success: true,
        deletedUnperformedCount: unperformedEvents.length,
        hasPaidHistory: paidEvents.length > 0,
      };
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
