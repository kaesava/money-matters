import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { incomeSources, incomeEvents } from "@money-matters/db";
import { and, eq, sql, inArray } from "drizzle-orm";
import { generateBurstDates } from "@money-matters/capability-budgeting";
import { z } from 'zod';
import { getTenantLocalDateString } from './income-helpers.js';

export const incomeLifecycleProcedures = {
  archiveIncomeSource: privateTenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await ctx.db.transaction(async (tx) => {
        const events = await tx
          .select()
          .from(incomeEvents)
          .where(
            and(
              eq(incomeEvents.incomeSourceId, input.id),
              eq(incomeEvents.tenantId, ctx.tenantId!),
              eq(incomeEvents.appId, ctx.appId!)
            )
          );

        const confirmedEvents = events.filter((e) => e.status !== "PENDING");
        const unperformedEvents = events.filter((e) => e.status === "PENDING");

        if (unperformedEvents.length > 0) {
          await tx
            .update(incomeEvents)
            .set({ archivedAt: new Date(), updatedBy: ctx.userId!, updatedAt: new Date() })
            .where(
              and(
                inArray(incomeEvents.id, unperformedEvents.map((e) => e.id)),
                eq(incomeEvents.tenantId, ctx.tenantId!),
                eq(incomeEvents.appId, ctx.appId!)
              )
            );
        }

        const [archived] = await tx
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
      });
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
          .update(incomeEvents)
          .set({ archivedAt: new Date(), updatedBy: ctx.userId!, updatedAt: new Date() })
          .where(inArray(incomeEvents.id, unperformedEvents.map((e) => e.id)));
      }

      const startDate = source.startDate || await getTenantLocalDateString(ctx.db, ctx.tenantId!);
      const dates = generateBurstDates(source.rrule, startDate, source.endDate, 12);
      if (dates.length > 0) {
        await ctx.db.insert(incomeEvents).values(
          await Promise.all(
            dates.map(async (d) => ({
              incomeSourceId: source.id,
              expectedDate: await getTenantLocalDateString(ctx.db, ctx.tenantId!, d),
              expectedAmount: source.amount,
              status: "PENDING" as const,
              tenantId: ctx.tenantId!,
              appId: ctx.appId!,
              createdBy: ctx.userId!,
              updatedBy: ctx.userId!,
            }))
          )
        );
      }

      return { count: dates.length };
    }),
};
