import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { incomeSources, incomeEvents } from "@money-matters/db";
import { and, eq, sql, asc, inArray } from "drizzle-orm";
import { generateBurstDates, maintainRollingWindowCommand } from "@money-matters/capability-budgeting";
import { posthog } from '../lib/posthog.js';
import {
  CreateIncomeEventCommand,
} from "@money-matters/types";
import { z } from 'zod';

const getAestDateString = (d: Date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);

export const incomeRouter = {
  createIncomeSource: privateTenantProcedure

    .input(
      z.object({
        name: z.string().min(1),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        receivingAccountId: z.string().uuid().optional(),
        isRecurring: z.boolean().default(true),
        startDate: z.string().optional(),
        endDate: z.string().nullable().optional(),
        frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
        interval: z.number().min(1).max(365).optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      let rrule: string | null = null;
      if (input.isRecurring && input.startDate) {
        const intVal = input.interval ?? 1;
        if (input.frequency === "WEEKLY") rrule = intVal > 1 ? `FREQ=WEEKLY;INTERVAL=${intVal}` : "FREQ=WEEKLY";
        else if (input.frequency === "FORTNIGHTLY") rrule = `FREQ=WEEKLY;INTERVAL=${intVal * 2}`;
        else if (input.frequency === "ANNUALLY") rrule = intVal > 1 ? `FREQ=YEARLY;INTERVAL=${intVal}` : "FREQ=YEARLY";
        else rrule = intVal > 1 ? `FREQ=MONTHLY;INTERVAL=${intVal}` : "FREQ=MONTHLY";
      }

      const [source] = await ctx.db
        .insert(incomeSources)
        .values({
          name: input.name,
          amount: input.amount,
          receivingAccountId: input.receivingAccountId || null,
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

      if (input.isRecurring && input.startDate && rrule) {
        const dates = generateBurstDates(rrule, input.startDate, input.endDate, 12);
        if (dates.length > 0) {
          const insertedEvents = await ctx.db.insert(incomeEvents).values(
            dates.map((d) => ({
              incomeSourceId: source.id,
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
      } else if (input.startDate) {
        const [insertedEvent] = await ctx.db.insert(incomeEvents).values({
          incomeSourceId: source.id,
          expectedDate: input.startDate,
          expectedAmount: input.amount,
          status: "PENDING",
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        }).returning();
        firstEventId = insertedEvent?.id ?? null;
      }

      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'income_source_created',
          properties: {
            tenant_id: ctx.tenantId,
            is_recurring: input.isRecurring,
            frequency: input.frequency ?? (input.isRecurring ? 'MONTHLY' : null),
            amount: input.amount,
          },
        });
        await posthog.flush();
      }
      return { ...source, firstEventId };
    }),

  updateIncomeSource: privateTenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          name: z.string().min(1).optional(),
          amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
          receivingAccountId: z.string().uuid().optional(),
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
        .from(incomeSources)
        .where(
          and(
            eq(incomeSources.id, input.id),
            eq(incomeSources.tenantId, ctx.tenantId!),
            eq(incomeSources.appId, ctx.appId!),
            sql`${incomeSources.archivedAt} IS NULL`
          )
        );

      if (!source) {
        throw new Error("Income source not found or unauthorized.");
      }

      const events = await ctx.db
        .select()
        .from(incomeEvents)
        .where(eq(incomeEvents.incomeSourceId, source.id));

      const confirmedEvents = events.filter((e) => e.status !== "PENDING");
      const unperformedEvents = events.filter((e) => e.status === "PENDING");

      const newName = input.data.name ?? source.name;
      const newAmount = input.data.amount ?? source.amount;
      const newReceivingAccountId =
        input.data.receivingAccountId !== undefined ? input.data.receivingAccountId : source.receivingAccountId;
      const newEndDate = input.data.endDate !== undefined ? input.data.endDate : source.endDate;

      const wasRecurring = !!source.rrule;
      const isRecurring = input.data.isRecurring !== undefined ? input.data.isRecurring : wasRecurring;

      let newStartDate = input.data.startDate;
      if (!newStartDate) {
        if (source.startDate) newStartDate = source.startDate;
        else if (unperformedEvents.length > 0 && unperformedEvents[0].expectedDate) newStartDate = unperformedEvents[0].expectedDate;
        else newStartDate = getAestDateString();
      }

      const newFreq = input.data.frequency;
      const newInt = input.data.interval ?? 1;
      let rrule: string | null = isRecurring ? (source.rrule || "FREQ=MONTHLY") : null;
      if (isRecurring && (newFreq || input.data.interval !== undefined)) {
        const targetFreq = newFreq || (source.rrule?.includes("FREQ=WEEKLY") ? (source.rrule.includes("INTERVAL=2") ? "FORTNIGHTLY" : "WEEKLY") : source.rrule?.includes("FREQ=YEARLY") ? "ANNUALLY" : "MONTHLY");
        if (targetFreq === "WEEKLY") rrule = newInt > 1 ? `FREQ=WEEKLY;INTERVAL=${newInt}` : "FREQ=WEEKLY";
        else if (targetFreq === "FORTNIGHTLY") rrule = `FREQ=WEEKLY;INTERVAL=${newInt * 2}`;
        else if (targetFreq === "ANNUALLY") rrule = newInt > 1 ? `FREQ=YEARLY;INTERVAL=${newInt}` : "FREQ=YEARLY";
        else rrule = newInt > 1 ? `FREQ=MONTHLY;INTERVAL=${newInt}` : "FREQ=MONTHLY";
      }

      const typeChanged = wasRecurring !== isRecurring;
      const scheduleOrFreqChanged = isRecurring && (
        typeChanged ||
        (input.data.startDate && input.data.startDate !== source.startDate) ||
        (input.data.endDate !== undefined && input.data.endDate !== source.endDate) ||
        (newFreq && rrule !== source.rrule)
      );

      if (typeChanged || scheduleOrFreqChanged) {
        if (unperformedEvents.length > 0) {
          await ctx.db
            .delete(incomeEvents)
            .where(inArray(incomeEvents.id, unperformedEvents.map((e) => e.id)));
        }

        if (isRecurring && rrule) {
          const dates = generateBurstDates(rrule, newStartDate, newEndDate, 12);
          if (dates.length > 0) {
            await ctx.db.insert(incomeEvents).values(
              dates.map((d) => ({
                incomeSourceId: source.id,
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
        } else {
          await ctx.db.insert(incomeEvents).values({
            incomeSourceId: source.id,
            expectedDate: newStartDate,
            expectedAmount: newAmount,
            status: "PENDING",
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            createdBy: ctx.userId!,
            updatedBy: ctx.userId!,
          });
        }
      } else {
        if (unperformedEvents.length > 0) {
          const unperformedIds = unperformedEvents.map((e) => e.id);
          const updateData: {
            expectedAmount: string;
            updatedAt: Date;
            updatedBy: string;
            expectedDate?: string;
          } = {
            expectedAmount: newAmount,
            updatedAt: new Date(),
            updatedBy: ctx.userId!,
          };
          if (!isRecurring && input.data.startDate) {
            updateData.expectedDate = input.data.startDate;
          }
          await ctx.db
            .update(incomeEvents)
            .set(updateData)
            .where(inArray(incomeEvents.id, unperformedIds));
        }
      }

      const [updated] = await ctx.db
        .update(incomeSources)
        .set({
          name: newName,
          amount: newAmount,
          receivingAccountId: newReceivingAccountId,
          rrule,
          startDate: isRecurring ? newStartDate : (input.data.startDate || source.startDate),
          endDate: newEndDate,
          updatedAt: new Date(),
          updatedBy: ctx.userId!,
        })
        .where(eq(incomeSources.id, source.id))
        .returning();

      return {
        updated,
        hasConfirmedHistory: confirmedEvents.length > 0,
        unperformedUpdatedCount: unperformedEvents.length,
      };
    }),

  createIncomeEvent: privateTenantProcedure
    .input(CreateIncomeEventCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [event] = await ctx.db
        .insert(incomeEvents)
        .values({
          incomeSourceId: input.incomeSourceId,
          expectedDate: input.expectedDate,
          expectedAmount: input.expectedAmount,
          status: "PENDING",
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();
      return event;
    }),

  listIncomeEvents: privateTenantProcedure
    .query(async ({ ctx }) => {
      // Lazy Materialization: Maintain rolling 12-month window on-the-fly before returning query
      try {
        await maintainRollingWindowCommand({
          db: ctx.db,
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          userId: ctx.userId!,
        });
      } catch (_err) {
        // Safe fallback if maintenance fail-safe triggers
      }


      const events = await ctx.db
        .select({
          id: incomeEvents.id,
          expectedDate: incomeEvents.expectedDate,
          expectedAmount: incomeEvents.expectedAmount,
          actualAmount: incomeEvents.actualAmount,
          isOverridden: incomeEvents.isOverridden,
          paymentMethod: incomeEvents.paymentMethod,
          status: incomeEvents.status,
          note: incomeEvents.note,
          incomeSourceId: incomeEvents.incomeSourceId,
          sourceName: incomeSources.name,
        })
        .from(incomeEvents)
        .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
        .where(
          and(
            eq(incomeEvents.tenantId, ctx.tenantId!),
            eq(incomeEvents.appId, ctx.appId!),
            sql`${incomeEvents.archivedAt} IS NULL`
          )
        )
        .orderBy(asc(incomeEvents.expectedDate));

      const firstUpcoming = events.find((e) => e.status === "PENDING");
      const nextId = firstUpcoming?.id;

      return events.map((e) => ({
        ...e,
        isNextPayday: e.id === nextId,
      }));
    }),

  listIncomeSources: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select({
          id: incomeSources.id,
          name: incomeSources.name,
          amount: incomeSources.amount,
          receivingAccountId: incomeSources.receivingAccountId,
          rrule: incomeSources.rrule,
          startDate: incomeSources.startDate,
          endDate: incomeSources.endDate,
        })
        .from(incomeSources)
        .where(
          and(
            eq(incomeSources.tenantId, ctx.tenantId!),
            eq(incomeSources.appId, ctx.appId!),
            sql`${incomeSources.archivedAt} IS NULL`,
            sql`${incomeSources.rrule} IS NOT NULL`
          )
        );
    }),

  archiveIncomeSource: privateTenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const events = await ctx.db
        .select()
        .from(incomeEvents)
        .where(eq(incomeEvents.incomeSourceId, input.id));

      const confirmedEvents = events.filter((e) => e.status !== "PENDING");
      const unperformedEvents = events.filter((e) => e.status === "PENDING");

      if (unperformedEvents.length > 0) {
        await ctx.db
          .delete(incomeEvents)
          .where(inArray(incomeEvents.id, unperformedEvents.map((e) => e.id)));
      }

      const [archived] = await ctx.db
        .update(incomeSources)
        .set({
          archivedAt: new Date(),
          updatedBy: ctx.userId!,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(incomeSources.id, input.id),
            eq(incomeSources.tenantId, ctx.tenantId!),
            eq(incomeSources.appId, ctx.appId!),
            sql`${incomeSources.archivedAt} IS NULL`
          )
        )
        .returning();

      if (!archived) {
        throw new Error("Income source not found or access unauthorized.");
      }

      return {
        success: true,
        deletedUnperformedCount: unperformedEvents.length,
        hasConfirmedHistory: confirmedEvents.length > 0,
      };
    }),

  createUpcomingIncome: privateTenantProcedure
    .input(
      z.object({
        name: z.string().min(1),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        expectedDate: z.string(),
        receivingAccountId: z.string().uuid().optional(),
        note: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [source] = await ctx.db
        .insert(incomeSources)
        .values({
          name: input.name,
          amount: input.amount,
          receivingAccountId: input.receivingAccountId || null,
          rrule: null,
          startDate: input.expectedDate,
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();

      const [evt] = await ctx.db
        .insert(incomeEvents)
        .values({
          incomeSourceId: source.id,
          expectedDate: input.expectedDate,
          expectedAmount: input.amount,
          note: input.note || null,
          status: "PENDING",
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();

      return evt;
    }),

  updateUpcomingIncome: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        expectedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        expectedDate: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [updated] = await ctx.db
        .update(incomeEvents)
        .set({
          ...(input.expectedAmount !== undefined ? { expectedAmount: input.expectedAmount } : {}),
          ...(input.expectedDate !== undefined ? { expectedDate: input.expectedDate } : {}),
          updatedAt: new Date(),
          updatedBy: ctx.userId!,
        })
        .where(
          and(
            eq(incomeEvents.id, input.eventId),
            eq(incomeEvents.tenantId, ctx.tenantId!),
            eq(incomeEvents.appId, ctx.appId!)
          )
        )
        .returning();
      return updated;
    }),

  markIncomeReceived: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        actualAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        note: z.string().optional(),
        recordedAt: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [evt] = await ctx.db
        .select()
        .from(incomeEvents)
        .where(
          and(
            eq(incomeEvents.id, input.eventId),
            eq(incomeEvents.tenantId, ctx.tenantId!),
            eq(incomeEvents.appId, ctx.appId!)
          )
        );

      if (!evt) throw new Error("Income event not found.");

      const amountToReceive = input.actualAmount || evt.expectedAmount;

      await ctx.db
        .update(incomeEvents)
        .set({
          status: "CONFIRMED",
          actualAmount: amountToReceive,
          updatedAt: new Date(),
          updatedBy: ctx.userId!,
        })
        .where(eq(incomeEvents.id, input.eventId));

      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'income_marked_received',
          properties: {
            tenant_id: ctx.tenantId,
            amount: amountToReceive,
          },
        });
        await posthog.flush();
      }
      return { success: true, message: "Income marked as received." };
    }),

  deleteIncomeEvent: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      await ctx.db
        .delete(incomeEvents)
        .where(
          and(
            eq(incomeEvents.id, input.eventId),
            eq(incomeEvents.tenantId, ctx.tenantId!),
            eq(incomeEvents.appId, ctx.appId!)
          )
        );
      return { success: true };
    }),

  skipIncomeEvent: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      await ctx.db
        .delete(incomeEvents)
        .where(
          and(
            eq(incomeEvents.id, input.eventId),
            eq(incomeEvents.tenantId, ctx.tenantId!),
            eq(incomeEvents.appId, ctx.appId!)
          )
        );
      return { success: true };
    }),

  reburstIncomeSource: privateTenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [source] = await ctx.db
        .select()
        .from(incomeSources)
        .where(
          and(
            eq(incomeSources.id, input.id),
            eq(incomeSources.tenantId, ctx.tenantId!),
            eq(incomeSources.appId, ctx.appId!),
            sql`${incomeSources.archivedAt} IS NULL`
          )
        );

      if (!source) throw new Error("Income source not found or unauthorized.");
      if (!source.rrule) return { count: 0 };

      const unperformedEvents = await ctx.db
        .select()
        .from(incomeEvents)
        .where(
          and(
            eq(incomeEvents.incomeSourceId, source.id),
            eq(incomeEvents.status, "PENDING")
          )
        );

      if (unperformedEvents.length > 0) {
        await ctx.db
          .delete(incomeEvents)
          .where(inArray(incomeEvents.id, unperformedEvents.map((e) => e.id)));
      }

      const startDate = source.startDate || getAestDateString();
      const dates = generateBurstDates(source.rrule, startDate, source.endDate, 12);
      if (dates.length > 0) {
        await ctx.db.insert(incomeEvents).values(
          dates.map((d) => ({
            incomeSourceId: source.id,
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
};
