import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { incomeSources, incomeEvents, bankAccounts } from "@money-matters/db";
import { and, eq, sql, inArray } from "drizzle-orm";
import { generateBurstDates } from "@money-matters/capability-budgeting";
import { posthog } from '../../lib/posthog.js';
import { z } from 'zod';
import { getTenantLocalDateString, buildRRule } from './income-helpers.js';

export const incomeSourcesProcedures = {
  createIncomeSource: privateTenantProcedure
    .input(
      z.object({
        name: z.string().min(1),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        receivingAccountId: z.string().uuid().optional(),
        isRecurring: z.boolean().default(true),
        startDate: z.string().optional(),
        endDate: z.string().nullable().optional(),
        frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "QUARTERLY", "ANNUALLY"]).optional(),
        interval: z.number().min(1).max(365).optional(),
        contributionMode: z.enum(["FULL", "PERCENTAGE", "FIXED_AMOUNT"]).optional(),
        contributionValue: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);

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

      let rrule: string | null = null;
      if (input.isRecurring && input.startDate) {
        rrule = buildRRule(input.frequency, input.interval ?? 1);
      }

      if (!input.isRecurring) {
        const eventDate = input.startDate || await getTenantLocalDateString(ctx.db, ctx.tenantId!);
        const [insertedEvent] = await ctx.db
          .insert(incomeEvents)
          .values({
            incomeSourceId: null,
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
          receivingAccountId: input.receivingAccountId || null,
          rrule: null,
          startDate: eventDate,
          endDate: null,
          contributionMode: input.contributionMode || "FULL",
          contributionValue: input.contributionValue || null,
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
        .insert(incomeSources)
        .values({
          name: input.name,
          amount: input.amount,
          receivingAccountId: input.receivingAccountId || null,
          rrule,
          startDate: input.startDate || null,
          endDate: input.endDate || null,
          contributionMode: input.contributionMode || "FULL",
          contributionValue: input.contributionValue || null,
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
          const insertedEvents = await ctx.db.insert(incomeEvents).values(
            await Promise.all(
              dates.map(async (d) => ({
                incomeSourceId: source.id,
                name: input.name,
                expectedDate: await getTenantLocalDateString(ctx.db, ctx.tenantId!, d),
                expectedAmount: input.amount,
                status: "PENDING" as const,
                tenantId: ctx.tenantId!,
                appId: ctx.appId!,
                createdBy: ctx.userId!,
                updatedBy: ctx.userId!,
              }))
            )
          ).returning();
          firstEventId = insertedEvents[0]?.id ?? null;
        }
      }

      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'income_source_created',
          properties: {
            tenant_id: ctx.tenantId,
            is_recurring: input.isRecurring,
            frequency: input.frequency ?? (input.isRecurring ? 'MONTHLY' : null),
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
          frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "QUARTERLY", "ANNUALLY"]).optional(),
          interval: z.number().min(1).max(365).optional(),
          contributionMode: z.enum(["FULL", "PERCENTAGE", "FIXED_AMOUNT"]).optional(),
          contributionValue: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
        }).strict(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [sourceRow] = await ctx.db
        .select({
          source: incomeSources,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
        })
        .from(incomeSources)
        .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
        .where(
          and(
            eq(incomeSources.id, input.id),
            eq(incomeSources.tenantId, ctx.tenantId!),
            eq(incomeSources.appId, ctx.appId!),
            sql`${incomeSources.archivedAt} IS NULL`
          )
        );

      if (!sourceRow) {
        throw new Error("Income source not found or unauthorized.");
      }

      if (sourceRow.bankAccountIsPrivate && sourceRow.bankAccountUserId !== ctx.userId) {
        throw new Error("Income source not found or unauthorized.");
      }

      const source = sourceRow.source;

      if (input.data.receivingAccountId) {
        const [acc] = await ctx.db
          .select({ isPrivate: bankAccounts.isPrivate, userId: bankAccounts.userId })
          .from(bankAccounts)
          .where(
            and(
              eq(bankAccounts.id, input.data.receivingAccountId),
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
        else newStartDate = await getTenantLocalDateString(ctx.db, ctx.tenantId!);
      }

      if (!isRecurring) {
        await ctx.db
          .update(incomeEvents)
          .set({ incomeSourceId: null })
          .where(
            and(
              eq(incomeEvents.incomeSourceId, source.id),
              eq(incomeEvents.tenantId, ctx.tenantId!),
              eq(incomeEvents.appId, ctx.appId!)
            )
          );

        if (unperformedEvents.length > 0) {
          await ctx.db
            .update(incomeEvents)
            .set({ archivedAt: new Date(), updatedBy: ctx.userId!, updatedAt: new Date() })
            .where(inArray(incomeEvents.id, unperformedEvents.map((e) => e.id)));
        }

        const [oneOffEvent] = await ctx.db
          .insert(incomeEvents)
          .values({
            incomeSourceId: null,
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

        await ctx.db
          .update(incomeSources)
          .set({ archivedAt: new Date(), updatedBy: ctx.userId!, updatedAt: new Date() })
          .where(
            and(
              eq(incomeSources.id, source.id),
              eq(incomeSources.tenantId, ctx.tenantId!),
              eq(incomeSources.appId, ctx.appId!)
            )
          );

        return {
          updated: null,
          hasConfirmedHistory: confirmedEvents.length > 0,
          unperformedUpdatedCount: unperformedEvents.length,
          deletedScheduleId: source.id,
          firstEventId: oneOffEvent.id,
        };
      }

      const newFreq = input.data.frequency;
      const newInt = input.data.interval ?? 1;
      let rrule: string | null = source.rrule || "FREQ=MONTHLY";
      if (newFreq || input.data.interval !== undefined) {
        const targetFreq = newFreq || (source.rrule?.includes("FREQ=WEEKLY") ? (source.rrule.includes("INTERVAL=2") ? "FORTNIGHTLY" : "WEEKLY") : source.rrule?.includes("FREQ=YEARLY") ? "ANNUALLY" : "MONTHLY");
        rrule = buildRRule(targetFreq, newInt);
      }

      if (unperformedEvents.length > 0) {
        await ctx.db
          .update(incomeEvents)
          .set({ archivedAt: new Date(), updatedBy: ctx.userId!, updatedAt: new Date() })
          .where(inArray(incomeEvents.id, unperformedEvents.map((e) => e.id)));
      }

      if (rrule) {
        const dates = generateBurstDates(rrule, newStartDate, newEndDate, 12);
        if (dates.length > 0) {
          await ctx.db.insert(incomeEvents).values(
            await Promise.all(
              dates.map(async (d) => ({
                incomeSourceId: source.id,
                expectedDate: await getTenantLocalDateString(ctx.db, ctx.tenantId!, d),
                expectedAmount: newAmount,
                status: "PENDING" as const,
                tenantId: ctx.tenantId!,
                appId: ctx.appId!,
                createdBy: ctx.userId!,
                updatedBy: ctx.userId!,
              }))
            )
          );
        }
      }

      const [updated] = await ctx.db
        .update(incomeSources)
        .set({
          name: newName,
          amount: newAmount,
          receivingAccountId: newReceivingAccountId,
          rrule,
          startDate: newStartDate,
          endDate: newEndDate,
          ...(input.data.contributionMode !== undefined ? { contributionMode: input.data.contributionMode } : {}),
          ...(input.data.contributionValue !== undefined ? { contributionValue: input.data.contributionValue } : {}),
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

  listIncomeSources: privateTenantProcedure
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select({
          id: incomeSources.id,
          name: incomeSources.name,
          amount: incomeSources.amount,
          receivingAccountId: incomeSources.receivingAccountId,
          rrule: incomeSources.rrule,
          startDate: incomeSources.startDate,
          endDate: incomeSources.endDate,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
        })
        .from(incomeSources)
        .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
        .where(
          and(
            eq(incomeSources.tenantId, ctx.tenantId!),
            eq(incomeSources.appId, ctx.appId!),
            sql`${incomeSources.archivedAt} IS NULL`,
            sql`${incomeSources.rrule} IS NOT NULL`
          )
        );

      return rows.filter((r) => {
        if (r.bankAccountIsPrivate && r.bankAccountUserId !== ctx.userId) return false;
        return true;
      });
    }),

};
