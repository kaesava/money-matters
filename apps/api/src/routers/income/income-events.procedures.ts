import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { incomeSources, incomeEvents, bankAccounts } from "@money-matters/db";
import { and, eq, sql, asc } from "drizzle-orm";
import { posthog } from '../../lib/posthog.js';
import { CreateIncomeEventCommand } from "@money-matters/types";
import { z } from 'zod';

export const incomeEventsProcedures = {
  createIncomeEvent: privateTenantProcedure
    .input(CreateIncomeEventCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);

      if (input.incomeSourceId) {
        const [source] = await ctx.db
          .select({
            bankAccountIsPrivate: bankAccounts.isPrivate,
            bankAccountUserId: bankAccounts.userId,
          })
          .from(incomeSources)
          .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
          .where(
            and(
              eq(incomeSources.id, input.incomeSourceId),
              eq(incomeSources.tenantId, ctx.tenantId!),
              eq(incomeSources.appId, ctx.appId!),
              sql`${incomeSources.archivedAt} IS NULL`
            )
          );

        if (!source) throw new Error("Income source not found.");
        if (source.bankAccountIsPrivate && source.bankAccountUserId !== ctx.userId) {
          throw new Error("Income source not found.");
        }
      }

      const [event] = await ctx.db
        .insert(incomeEvents)
        .values({
          incomeSourceId: input.incomeSourceId,
          name: input.name || null,
          expectedDate: input.expectedDate,
          actualDate: input.expectedDate,
          expectedAmount: input.expectedAmount,
          actualAmount: input.expectedAmount,
          contributionMode: input.contributionMode || "FULL",
          contributionValue: input.contributionValue || null,
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
          contributionMode: sql<string>`COALESCE(${incomeEvents.contributionMode}, ${incomeSources.contributionMode}, 'FULL')`,
          contributionValue: sql<string | null>`COALESCE(${incomeEvents.contributionValue}, ${incomeSources.contributionValue})`,
          status: incomeEvents.status,
          note: incomeEvents.note,
          incomeSourceId: incomeEvents.incomeSourceId,
          sourceName: incomeSources.name,
          bankAccountId: incomeSources.receivingAccountId,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
          createdBy: incomeEvents.createdBy,
        })
        .from(incomeEvents)
        .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
        .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
        .where(
          and(
            eq(incomeEvents.tenantId, ctx.tenantId!),
            eq(incomeEvents.appId, ctx.appId!),
            sql`${incomeEvents.archivedAt} IS NULL`
          )
        )
        .orderBy(asc(incomeEvents.expectedDate));

      const visibleEvents = events.filter((e) => {
        if (e.bankAccountId && e.bankAccountIsPrivate === null) return false;
        if (e.bankAccountIsPrivate && e.bankAccountUserId !== ctx.userId) return false;
        if (!e.incomeSourceId && e.createdBy && e.createdBy !== ctx.userId) return false;
        return true;
      });

      const firstUpcoming = visibleEvents.find((e) => e.status === "PENDING");
      const nextId = firstUpcoming?.id;

      return visibleEvents.map((e) => ({
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
        contributionMode: z.enum(["FULL", "PERCENTAGE", "FIXED_AMOUNT"]).optional(),
        contributionValue: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
        note: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);

      if (input.contributionMode === "FIXED_AMOUNT" && input.contributionValue) {
        if (parseFloat(input.contributionValue) > parseFloat(input.amount)) {
          throw new Error("Household contribution cannot exceed the expected income amount.");
        }
      }

      if (input.receivingAccountId) {
        const [acc] = await ctx.db
          .select({ isPrivate: bankAccounts.isPrivate, userId: bankAccounts.userId })
          .from(bankAccounts)
          .where(
            and(
              eq(bankAccounts.id, input.receivingAccountId),
              eq(bankAccounts.tenantId, ctx.tenantId!),
              eq(bankAccounts.appId, ctx.appId!),
              sql`${bankAccounts.archivedAt} IS NULL`
            )
          )
          .limit(1);

        if (!acc) throw new Error("Receiving bank account not found.");
        if (acc.isPrivate && acc.userId !== ctx.userId) {
          throw new Error("Receiving bank account not found.");
        }
      }

      const [source] = await ctx.db
        .insert(incomeSources)
        .values({
          name: input.name,
          amount: input.amount,
          receivingAccountId: input.receivingAccountId || null,
          rrule: null,
          startDate: input.expectedDate,
          contributionMode: input.contributionMode || "FULL",
          contributionValue: input.contributionValue || null,
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
          name: input.name,
          expectedDate: input.expectedDate,
          actualDate: input.expectedDate,
          expectedAmount: input.amount,
          actualAmount: input.amount,
          contributionMode: input.contributionMode || "FULL",
          contributionValue: input.contributionValue || null,
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
        contributionMode: z.enum(["FULL", "PERCENTAGE", "FIXED_AMOUNT"]).optional(),
        contributionValue: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [existing] = await ctx.db
        .select({
          incomeSourceId: incomeEvents.incomeSourceId,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
        })
        .from(incomeEvents)
        .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
        .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
        .where(
          and(
            eq(incomeEvents.id, input.eventId),
            eq(incomeEvents.tenantId, ctx.tenantId!),
            eq(incomeEvents.appId, ctx.appId!),
            sql`${incomeEvents.archivedAt} IS NULL`
          )
        )
        .limit(1);

      if (!existing) {
        throw new Error("Income event not found.");
      }

      if (existing.bankAccountIsPrivate && existing.bankAccountUserId !== ctx.userId) {
        throw new Error("Income event not found.");
      }

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
        .select({
          id: incomeEvents.id,
          expectedAmount: incomeEvents.expectedAmount,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
        })
        .from(incomeEvents)
        .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
        .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
        .where(
          and(
            eq(incomeEvents.id, input.eventId),
            eq(incomeEvents.tenantId, ctx.tenantId!),
            eq(incomeEvents.appId, ctx.appId!),
            sql`${incomeEvents.archivedAt} IS NULL`
          )
        );

      if (!evt) throw new Error("Income event not found.");
      if (evt.bankAccountIsPrivate && evt.bankAccountUserId !== ctx.userId) {
        throw new Error("Income event not found.");
      }

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
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [evt] = await ctx.db
        .select({
          id: incomeEvents.id,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
        })
        .from(incomeEvents)
        .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
        .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
        .where(
          and(
            eq(incomeEvents.id, input.eventId),
            eq(incomeEvents.tenantId, ctx.tenantId!),
            eq(incomeEvents.appId, ctx.appId!),
            sql`${incomeEvents.archivedAt} IS NULL`
          )
        );

      if (!evt) throw new Error("Income event not found.");
      if (evt.bankAccountIsPrivate && evt.bankAccountUserId !== ctx.userId) {
        throw new Error("Income event not found.");
      }

      await ctx.db
        .update(incomeEvents)
        .set({
          archivedAt: new Date(),
          archivedBy: ctx.userId!,
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
