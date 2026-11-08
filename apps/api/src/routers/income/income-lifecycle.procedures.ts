import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { incomeSources, incomeEvents, bankAccounts } from "@money-matters/db";
import { and, eq, sql, inArray } from "drizzle-orm";
import { z } from 'zod';

export const incomeLifecycleProcedures = {
  archiveIncomeSource: privateTenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await ctx.db.transaction(async (tx) => {
        const [source] = await tx
          .select({
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

        if (!source) throw new Error("Income source not found or access unauthorized.");
        if (source.bankAccountIsPrivate && source.bankAccountUserId !== ctx.userId) {
          throw new Error("Income source not found or access unauthorized.");
        }

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
};
