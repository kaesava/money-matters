import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { expenseSources, categories, expenseEvents, pools } from "@money-matters/db";
import { and, eq, sql, inArray } from "drizzle-orm";
import { generateBurstDates } from "@money-matters/capability-budgeting";
import { recordExpenseCommand } from "@money-matters/capability-transactions";
import { z } from 'zod';
import { posthog } from '../lib/posthog.js';

const getAestDateString = (d: Date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);

export const expensesRouter = {
  listExpenseSources: privateTenantProcedure
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
            sql`${expenseSources.archivedAt} IS NULL`,
            sql`${expenseSources.rrule} IS NOT NULL`
          )
        );
    }),

  createExpenseSource: privateTenantProcedure
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
        interval: z.number().min(1).max(365).optional(),
      }).strict()
    )
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

      let rrule: string | null = null;
      if (input.isRecurring && input.startDate) {
        const intVal = input.interval ?? 1;
        if (input.frequency === "WEEKLY") rrule = intVal > 1 ? `FREQ=WEEKLY;INTERVAL=${intVal}` : "FREQ=WEEKLY";
        else if (input.frequency === "FORTNIGHTLY") rrule = `FREQ=WEEKLY;INTERVAL=${intVal * 2}`;
        else if (input.frequency === "ANNUALLY") rrule = intVal > 1 ? `FREQ=YEARLY;INTERVAL=${intVal}` : "FREQ=YEARLY";
        else rrule = intVal > 1 ? `FREQ=MONTHLY;INTERVAL=${intVal}` : "FREQ=MONTHLY";
      }

      if (!input.isRecurring) {
        // One-off expense: create standalone unlinked event directly without creating a schedule record
        const eventDate = input.startDate || getAestDateString();
        const [insertedEvent] = await ctx.db
          .insert(expenseEvents)
          .values({
            expenseSourceId: null,
            poolId: input.poolId,
            categoryId: input.categoryId || null,
            name: input.name,
            expectedDate: eventDate,
            expectedAmount: input.amount,
            status: "PENDING" as const,
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            createdBy: ctx.userId!,
            updatedBy: ctx.userId!,
          })
          .returning();

        return {
          id: insertedEvent.id,
          name: input.name,
          amount: input.amount,
          poolId: input.poolId,
          categoryId: input.categoryId || null,
          rrule: null,
          startDate: eventDate,
          endDate: null,
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
          firstEventId: insertedEvent.id,
        };
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

      let firstEventId: string | null = null;

      if (input.startDate && rrule) {
        const dates = generateBurstDates(rrule, input.startDate, input.endDate, 12);
        if (dates.length > 0) {
          const insertedEvents = await ctx.db.insert(expenseEvents).values(
            dates.map((d) => ({
              expenseSourceId: source.id,
              poolId: input.poolId,
              categoryId: input.categoryId || null,
              name: input.name,
              expectedDate: getAestDateString(d),
              expectedAmount: input.amount,
              status: "PENDING" as const,
              tenantId: ctx.tenantId!,
              appId: ctx.appId!,
              createdBy: ctx.userId!,
              updatedBy: ctx.userId!,
            }))
          ).returning();
          firstEventId = insertedEvents[0]?.id ?? null;
        }
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

      return { ...source, firstEventId };
    }),

  updateExpenseSource: privateTenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          name: z.string().min(1).optional(),
          amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
          poolId: z.string().uuid().optional(),
          categoryId: z.string().uuid().optional(),
          isRecurring: z.boolean().optional(),
          startDate: z.string().optional(),
          endDate: z.string().nullable().optional(),
          frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
          interval: z.number().min(1).max(365).optional(),
        }).strict(),
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

      if (!source) {
        throw new Error("Expense source not found or unauthorized.");
      }

      const newName = input.data.name ?? source.name;
      const newAmount = input.data.amount ?? source.amount;
      const newPoolId = input.data.poolId ?? source.poolId;
      const newCategoryId = input.data.categoryId !== undefined ? input.data.categoryId : source.categoryId;
      const newEndDate = input.data.endDate !== undefined ? input.data.endDate : source.endDate;
      const newStartDate = input.data.startDate || source.startDate || getAestDateString();

      const wasRecurring = !!source.rrule;
      const isRecurring = input.data.isRecurring !== undefined ? input.data.isRecurring : wasRecurring;

      // When converting a recurring expense schedule to a one-off event:
      if (!isRecurring) {
        // 1. Unlink confirmed historical events from this schedule so FKs remain valid
        await ctx.db
          .update(expenseEvents)
          .set({ expenseSourceId: null })
          .where(
            and(
              eq(expenseEvents.expenseSourceId, source.id),
              eq(expenseEvents.tenantId, ctx.tenantId!),
              eq(expenseEvents.appId, ctx.appId!)
            )
          );

        // 2. Delete unperformed pending events linked to this schedule
        await ctx.db
          .delete(expenseEvents)
          .where(
            and(
              eq(expenseEvents.expenseSourceId, source.id),
              eq(expenseEvents.status, "PENDING"),
              eq(expenseEvents.tenantId, ctx.tenantId!),
              eq(expenseEvents.appId, ctx.appId!)
            )
          );

        // 3. Create a new standalone one-off event unlinked from schedule
        const [oneOffEvent] = await ctx.db
          .insert(expenseEvents)
          .values({
            expenseSourceId: null,
            poolId: newPoolId,
            categoryId: newCategoryId || null,
            name: newName,
            expectedDate: newStartDate,
            expectedAmount: newAmount,
            status: "PENDING" as const,
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            createdBy: ctx.userId!,
            updatedBy: ctx.userId!,
          })
          .returning();

        // 4. Delete the schedule record from expenseSources database table
        await ctx.db
          .delete(expenseSources)
          .where(
            and(
              eq(expenseSources.id, source.id),
              eq(expenseSources.tenantId, ctx.tenantId!),
              eq(expenseSources.appId, ctx.appId!)
            )
          );

        return {
          id: source.id,
          name: newName,
          amount: newAmount,
          poolId: newPoolId,
          categoryId: newCategoryId || null,
          rrule: null,
          startDate: newStartDate,
          endDate: null,
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
          createdAt: source.createdAt,
          updatedAt: new Date(),
          archivedAt: null,
          firstEventId: oneOffEvent.id,
        };
      }

      const newFreq = input.data.frequency;
      const newInt = input.data.interval ?? 1;
      let rrule: string | null = source.rrule || "FREQ=MONTHLY";
      if (newFreq || input.data.interval !== undefined) {
        const targetFreq = newFreq || (source.rrule?.includes("FREQ=WEEKLY") ? (source.rrule.includes("INTERVAL=2") ? "FORTNIGHTLY" : "WEEKLY") : source.rrule?.includes("FREQ=YEARLY") ? "ANNUALLY" : "MONTHLY");
        if (targetFreq === "WEEKLY") rrule = newInt > 1 ? `FREQ=WEEKLY;INTERVAL=${newInt}` : "FREQ=WEEKLY";
        else if (targetFreq === "FORTNIGHTLY") rrule = `FREQ=WEEKLY;INTERVAL=${newInt * 2}`;
        else if (targetFreq === "ANNUALLY") rrule = newInt > 1 ? `FREQ=YEARLY;INTERVAL=${newInt}` : "FREQ=YEARLY";
        else rrule = newInt > 1 ? `FREQ=MONTHLY;INTERVAL=${newInt}` : "FREQ=MONTHLY";
      }

      const [updated] = await ctx.db
        .update(expenseSources)
        .set({
          name: newName,
          amount: newAmount,
          poolId: newPoolId,
          categoryId: newCategoryId || null,
          rrule,
          startDate: input.data.startDate ?? source.startDate,
          endDate: newEndDate,
          updatedBy: ctx.userId!,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(expenseSources.id, input.id),
            eq(expenseSources.tenantId, ctx.tenantId!),
            eq(expenseSources.appId, ctx.appId!)
          )
        )
        .returning();

      // Delete existing unperformed events (keep CONFIRMED events) and re-burst with updated schedule & amounts
      const events = await ctx.db
        .select()
        .from(expenseEvents)
        .where(eq(expenseEvents.expenseSourceId, source.id));

      const unperformedEvents = events.filter((e) => e.status !== "CONFIRMED");
      if (unperformedEvents.length > 0) {
        await ctx.db
          .delete(expenseEvents)
          .where(inArray(expenseEvents.id, unperformedEvents.map((e) => e.id)));
      }

      if (rrule) {
        const dates = generateBurstDates(rrule, newStartDate, newEndDate, 12);
        if (dates.length > 0) {
          await ctx.db.insert(expenseEvents).values(
            dates.map((d) => ({
              expenseSourceId: source.id,
              poolId: newPoolId,
              categoryId: newCategoryId || null,
              name: newName,
              expectedDate: getAestDateString(d),
              expectedAmount: newAmount,
              status: "PENDING" as const,
              tenantId: ctx.tenantId!,
              appId: ctx.appId!,
              createdBy: ctx.userId!,
              updatedBy: ctx.userId!,
            }))
          );
        }
      }

      return updated;
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

  reburstExpenseSource: privateTenantProcedure
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
            eq(expenseEvents.status, "PENDING"),
            sql`${expenseEvents.archivedAt} IS NULL`
          )
        );

      if (unperformedEvents.length > 0) {
        await ctx.db
          .delete(expenseEvents)
          .where(inArray(expenseEvents.id, unperformedEvents.map((e) => e.id)));
      }

      const startDate = source.startDate || getAestDateString();
      const dates = generateBurstDates(source.rrule, startDate, source.endDate, 12);
      if (dates.length > 0) {
        await ctx.db.insert(expenseEvents).values(
          dates.map((d) => ({
            expenseSourceId: source.id,
            poolId: source.poolId,
            categoryId: source.categoryId,
            name: source.name,
            expectedDate: getAestDateString(d),
            expectedAmount: source.amount,
            status: "PENDING" as const,
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            createdBy: ctx.userId!,
            updatedBy: ctx.userId!,
          }))
        );
      }

      return { count: dates.length };
    }),

  archiveExpenseSource: privateTenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const events = await ctx.db
        .select()
        .from(expenseEvents)
        .where(eq(expenseEvents.expenseSourceId, input.id));

      const unperformedEvents = events.filter((e) => e.status === "PENDING");

      if (unperformedEvents.length > 0) {
        await ctx.db
          .delete(expenseEvents)
          .where(inArray(expenseEvents.id, unperformedEvents.map((e) => e.id)));
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

      if (!archived) {
        throw new Error("Expense source not found or access unauthorized.");
      }

      return {
        success: true,
        deletedUnperformedCount: unperformedEvents.length,
      };
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
        .delete(expenseEvents)
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
        .delete(expenseEvents)
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

      await ctx.db
        .update(expenseEvents)
        .set({
          status: "CONFIRMED",
          updatedAt: new Date(),
          updatedBy: ctx.userId!,
        })
        .where(eq(expenseEvents.id, input.eventId));

      if (evt.poolId) {
        await recordExpenseCommand(
          {
            poolId: evt.poolId,
            categoryId: evt.categoryId || undefined,
            flowType: "DEBIT",
            amount: evt.expectedAmount,
            source: "MANUAL",
            note: input.note || `Paid scheduled bill: ${evt.name}`,
            date: evt.expectedDate,
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
