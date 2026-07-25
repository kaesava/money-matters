import { tenantProcedure } from '../trpc/trpc.js';
import { incomeSources, incomeEvents } from "@money-matters/db";
import { and, eq, sql, asc } from "drizzle-orm";
import { generateBurstDates } from "@money-matters/capability-budgeting";
import {
  CreateIncomeEventCommand,
} from "@money-matters/types";
import { z } from 'zod';

export const incomeRouter = {
  createIncomeSource: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        receivingAccountId: z.string().uuid().optional(),
        isRecurring: z.boolean().default(true),
        startDate: z.string().optional(),
        frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      let rrule: string | null = null;
      if (input.isRecurring && input.startDate) {
        if (input.frequency === "WEEKLY") rrule = "FREQ=WEEKLY";
        else if (input.frequency === "FORTNIGHTLY") rrule = "FREQ=WEEKLY;INTERVAL=2";
        else if (input.frequency === "ANNUALLY") rrule = "FREQ=YEARLY";
        else rrule = "FREQ=MONTHLY";
      }

      const [source] = await ctx.db
        .insert(incomeSources)
        .values({
          name: input.name,
          amount: input.amount,
          receivingAccountId: input.receivingAccountId || null,
          rrule,
          startDate: input.startDate || null,
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();

      if (input.isRecurring && input.startDate && rrule) {
        const dates = generateBurstDates(rrule, input.startDate, null, 12);
        for (const d of dates) {
          await ctx.db.insert(incomeEvents).values({
            incomeSourceId: source.id,
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
        await ctx.db.insert(incomeEvents).values({
          incomeSourceId: source.id,
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

  updateIncomeSource: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          name: z.string().min(1).optional(),
          amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
          receivingAccountId: z.string().uuid().optional(),
          isRecurring: z.boolean().optional(),
          startDate: z.string().optional(),
          frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
        }).strict(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
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

      const confirmedEvents = events.filter((e) => e.status !== "UPCOMING");
      const unperformedEvents = events.filter((e) => e.status === "UPCOMING");

      const newName = input.data.name ?? source.name;
      const newAmount = input.data.amount ?? source.amount;
      const newReceivingAccountId =
        input.data.receivingAccountId !== undefined ? input.data.receivingAccountId : source.receivingAccountId;

      const wasRecurring = !!source.rrule;
      const isRecurring = input.data.isRecurring !== undefined ? input.data.isRecurring : wasRecurring;

      let newStartDate = input.data.startDate;
      if (!newStartDate) {
        if (source.startDate) newStartDate = source.startDate;
        else if (unperformedEvents.length > 0 && unperformedEvents[0].expectedDate) newStartDate = unperformedEvents[0].expectedDate;
        else newStartDate = new Date().toISOString().split("T")[0];
      }

      const newFreq = input.data.frequency;
      let rrule: string | null = isRecurring ? (source.rrule || "FREQ=MONTHLY") : null;
      if (isRecurring && newFreq) {
        if (newFreq === "WEEKLY") rrule = "FREQ=WEEKLY";
        else if (newFreq === "FORTNIGHTLY") rrule = "FREQ=WEEKLY;INTERVAL=2";
        else if (newFreq === "MONTHLY") rrule = "FREQ=MONTHLY";
        else if (newFreq === "ANNUALLY") rrule = "FREQ=YEARLY";
      }

      const typeChanged = wasRecurring !== isRecurring;
      const scheduleOrFreqChanged = isRecurring && (
        typeChanged ||
        (input.data.startDate && input.data.startDate !== source.startDate) ||
        (newFreq && rrule !== source.rrule)
      );

      if (typeChanged || scheduleOrFreqChanged) {
        for (const evt of unperformedEvents) {
          await ctx.db.delete(incomeEvents).where(eq(incomeEvents.id, evt.id));
        }

        if (isRecurring && rrule) {
          const dates = generateBurstDates(rrule, newStartDate, null, 12);
          for (const d of dates) {
            await ctx.db.insert(incomeEvents).values({
              incomeSourceId: source.id,
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
          await ctx.db.insert(incomeEvents).values({
            incomeSourceId: source.id,
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
        for (const evt of unperformedEvents) {
          await ctx.db
            .update(incomeEvents)
            .set({
              expectedAmount: newAmount,
              expectedDate: (!isRecurring && input.data.startDate) ? input.data.startDate : evt.expectedDate,
              updatedAt: new Date(),
              updatedBy: ctx.userId!,
            })
            .where(eq(incomeEvents.id, evt.id));
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

  createIncomeEvent: tenantProcedure
    .input(CreateIncomeEventCommand)
    .mutation(async ({ input, ctx }) => {
      const [event] = await ctx.db
        .insert(incomeEvents)
        .values({
          incomeSourceId: input.incomeSourceId,
          expectedDate: input.expectedDate,
          expectedAmount: input.expectedAmount,
          status: "UPCOMING",
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();
      return event;
    }),

  generateNextIncomeEvents: tenantProcedure
    .mutation(async ({ ctx }) => {
      const sources = await ctx.db
        .select()
        .from(incomeSources)
        .where(
          and(
            eq(incomeSources.tenantId, ctx.tenantId!),
            eq(incomeSources.appId, ctx.appId!),
            sql`${incomeSources.archivedAt} IS NULL`
          )
        );

      const todayStr = new Date().toISOString().split('T')[0];

      for (const source of sources) {
        const [existing] = await ctx.db
          .select()
          .from(incomeEvents)
          .where(
            and(
              eq(incomeEvents.incomeSourceId, source.id),
              eq(incomeEvents.expectedDate, todayStr)
            )
          );

        if (!existing) {
          await ctx.db.insert(incomeEvents).values({
            incomeSourceId: source.id,
            expectedAmount: source.amount,
            expectedDate: todayStr,
            status: "UPCOMING",
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            createdBy: ctx.userId!,
            updatedBy: ctx.userId!,
          });
        }
      }

      return { success: true, generated: sources.length };
    }),

  listIncomeSources: tenantProcedure
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
            sql`${incomeSources.archivedAt} IS NULL`
          )
        );
    }),

  archiveIncomeSource: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      const events = await ctx.db
        .select()
        .from(incomeEvents)
        .where(eq(incomeEvents.incomeSourceId, input.id));

      const confirmedEvents = events.filter((e) => e.status !== "UPCOMING");
      const unperformedEvents = events.filter((e) => e.status === "UPCOMING");

      for (const evt of unperformedEvents) {
        await ctx.db.delete(incomeEvents).where(eq(incomeEvents.id, evt.id));
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

  listIncomeEvents: tenantProcedure
    .query(async ({ ctx }) => {
      const events = await ctx.db
        .select({
          id: incomeEvents.id,
          expectedDate: incomeEvents.expectedDate,
          expectedAmount: incomeEvents.expectedAmount,
          actualAmount: incomeEvents.actualAmount,
          isOverridden: incomeEvents.isOverridden,
          paymentMethod: incomeEvents.paymentMethod,
          status: incomeEvents.status,
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

      const firstUpcoming = events.find((e) => e.status === "UPCOMING");
      const nextId = firstUpcoming?.id;

      return events.map((e) => ({
        ...e,
        isNextPayday: e.id === nextId,
      }));
    }),
};
