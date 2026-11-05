import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { incomeSources, incomeEvents } from "@money-matters/db";
import { and, eq, sql, asc } from "drizzle-orm";
import { posthog } from '../../lib/posthog.js';
import { CreateIncomeEventCommand } from "@money-matters/types";
import { z } from 'zod';

export const incomeEventsProcedures = {
  createIncomeEvent: privateTenantProcedure
    .input(CreateIncomeEventCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [event] = await ctx.db
        .insert(incomeEvents)
        .values({
          incomeSourceId: input.incomeSourceId,
          expectedDate: input.expectedDate,
          actualDate: input.expectedDate,
          expectedAmount: input.expectedAmount,
          actualAmount: input.expectedAmount,
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
      const events = await ctx.db
        .select({
          id: incomeEvents.id,
          name: sql<string>`COALESCE(NULLIF(${incomeEvents.name}, ''), ${incomeSources.name}, 'Paycheck')`,
          expectedDate: incomeEvents.expectedDate,
          actualDate: incomeEvents.actualDate,
          expectedAmount: incomeEvents.expectedAmount,
          actualAmount: incomeEvents.actualAmount,
          status: incomeEvents.status,
          note: incomeEvents.note,
          incomeSourceId: incomeEvents.incomeSourceId,
          sourceName: incomeSources.name,
          bankAccountId: incomeSources.receivingAccountId,
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
          actualDate: input.expectedDate,
          expectedAmount: input.amount,
          actualAmount: input.amount,
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
      const [existing] = await ctx.db
        .select({ incomeSourceId: incomeEvents.incomeSourceId })
        .from(incomeEvents)
        .where(
          and(
            eq(incomeEvents.id, input.eventId),
            eq(incomeEvents.tenantId, ctx.tenantId!),
            eq(incomeEvents.appId, ctx.appId!)
          )
        )
        .limit(1);

      const isScheduled = Boolean(existing?.incomeSourceId);
      const setPayload: Record<string, unknown> = {
        updatedAt: new Date(),
        updatedBy: ctx.userId!,
      };

      if (input.expectedAmount !== undefined) {
        setPayload.actualAmount = input.expectedAmount;
        if (!isScheduled) setPayload.expectedAmount = input.expectedAmount;
      }

      if (input.expectedDate !== undefined) {
        setPayload.actualDate = input.expectedDate;
        if (!isScheduled) setPayload.expectedDate = input.expectedDate;
      }

      const [updated] = await ctx.db
        .update(incomeEvents)
        .set(setPayload)
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
        status: z.enum(["SKIPPED", "DELETED"]).optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      await ctx.db
        .update(incomeEvents)
        .set({
          archivedAt: new Date(),
          updatedAt: new Date(),
          updatedBy: ctx.userId!,
        })
        .where(
          and(
            eq(incomeEvents.id, input.eventId),
            eq(incomeEvents.tenantId, ctx.tenantId!),
            eq(incomeEvents.appId, ctx.appId!)
          )
        );
      return { success: true };
    }),
};
