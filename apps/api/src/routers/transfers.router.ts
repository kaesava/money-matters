import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { transferSources, transferEvents, pools } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { moveMoneyCommand } from "@money-matters/capability-budgeting";
import { z } from 'zod';

export const transfersRouter = {
  listTransferEvents: privateTenantProcedure
    .query(async ({ ctx }) => {
      const sourcePools = alias(pools, "sourcePools");
      const destPools = alias(pools, "destPools");

      return await ctx.db
        .select({
          id: transferEvents.id,
          name: transferEvents.name,
          expectedAmount: transferEvents.expectedAmount,
          expectedDate: transferEvents.expectedDate,
          status: transferEvents.status,
          sourcePoolId: transferEvents.sourcePoolId,
          sourcePoolName: sourcePools.name,
          destinationPoolId: transferEvents.destinationPoolId,
          destinationPoolName: destPools.name,
          transferSourceId: transferEvents.transferSourceId,
        })
        .from(transferEvents)
        .leftJoin(sourcePools, eq(transferEvents.sourcePoolId, sourcePools.id))
        .leftJoin(destPools, eq(transferEvents.destinationPoolId, destPools.id))
        .where(
          and(
            eq(transferEvents.tenantId, ctx.tenantId!),
            eq(transferEvents.appId, ctx.appId!),
            sql`${transferEvents.archivedAt} IS NULL`
          )
        );
    }),

  createTransferSource: privateTenantProcedure
    .input(
      z.object({
        name: z.string().optional(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        sourcePoolId: z.string().uuid(),
        destinationPoolId: z.string().uuid(),
        startDate: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);

      if (input.sourcePoolId === input.destinationPoolId) {
        throw new Error("Source and destination pools must be different.");
      }

      const [sourcePool] = await ctx.db
        .select({ id: pools.id, name: pools.name })
        .from(pools)
        .where(
          and(
            eq(pools.id, input.sourcePoolId),
            eq(pools.tenantId, ctx.tenantId!),
            eq(pools.appId, ctx.appId!),
            sql`${pools.archivedAt} IS NULL`
          )
        )
        .limit(1);

      const [destPool] = await ctx.db
        .select({ id: pools.id, name: pools.name })
        .from(pools)
        .where(
          and(
            eq(pools.id, input.destinationPoolId),
            eq(pools.tenantId, ctx.tenantId!),
            eq(pools.appId, ctx.appId!),
            sql`${pools.archivedAt} IS NULL`
          )
        )
        .limit(1);

      if (!sourcePool || !destPool) {
        throw new Error("Source or destination pool not found.");
      }

      const transferName = input.name || `Transfer: ${sourcePool.name} ➔ ${destPool.name}`;

      const [source] = await ctx.db
        .insert(transferSources)
        .values({
          name: transferName,
          amount: input.amount,
          sourcePoolId: input.sourcePoolId,
          destinationPoolId: input.destinationPoolId,
          startDate: input.startDate || null,
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();

      let firstEventId: string | null = null;
      if (input.startDate) {
        const [insertedEvent] = await ctx.db
          .insert(transferEvents)
          .values({
            transferSourceId: source.id,
            sourcePoolId: input.sourcePoolId,
            destinationPoolId: input.destinationPoolId,
            name: transferName,
            expectedDate: input.startDate,
            expectedAmount: input.amount,
            status: "PENDING",
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            createdBy: ctx.userId!,
            updatedBy: ctx.userId!,
          })
          .returning();
        firstEventId = insertedEvent?.id ?? null;
      }

      return { ...source, firstEventId };
    }),

  skipTransferEvent: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      await ctx.db
        .update(transferEvents)
        .set({
          status: "SKIPPED",
          updatedAt: new Date(),
          updatedBy: ctx.userId!,
        })
        .where(
          and(
            eq(transferEvents.id, input.eventId),
            eq(transferEvents.tenantId, ctx.tenantId!),
            eq(transferEvents.appId, ctx.appId!)
          )
        );
      return { success: true };
    }),

  executeTransferEvent: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        sourcePoolId: z.string().uuid().optional(),
        destinationPoolId: z.string().uuid().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [evt] = await ctx.db
        .select()
        .from(transferEvents)
        .where(
          and(
            eq(transferEvents.id, input.eventId),
            eq(transferEvents.tenantId, ctx.tenantId!),
            eq(transferEvents.appId, ctx.appId!)
          )
        );

      if (!evt) throw new Error("Transfer event not found.");

      const sourcePoolId = input.sourcePoolId || evt.sourcePoolId;
      const destinationPoolId = input.destinationPoolId || evt.destinationPoolId;
      const amountToTransfer = input.amount || evt.expectedAmount;

      await moveMoneyCommand(
        {
          sourcePoolId,
          destinationPoolId,
          amount: amountToTransfer,
          note: evt.name,
        },
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        ctx.db
      );

      await ctx.db
        .update(transferEvents)
        .set({
          status: "COMPLETED",
          actualAmount: amountToTransfer,
          sourcePoolId,
          destinationPoolId,
          updatedAt: new Date(),
          updatedBy: ctx.userId!,
        })
        .where(eq(transferEvents.id, input.eventId));

      return { success: true, message: "Transfer completed successfully." };
    }),
};
