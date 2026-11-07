import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { transferEvents, envelopes, bankAccounts } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { moveMoneyCommand } from "@money-matters/capability-budgeting";
import { z } from 'zod';

export const transfersRouter = {
  listTransferEvents: privateTenantProcedure
    .query(async ({ ctx }) => {
      const sourceEnvelopes = alias(envelopes, "sourceEnvelopes");
      const destEnvelopes = alias(envelopes, "destEnvelopes");
      const sourceBankAccounts = alias(bankAccounts, "sourceBankAccounts");
      const destBankAccounts = alias(bankAccounts, "destBankAccounts");

      const rows = await ctx.db
        .select({
          id: transferEvents.id,
          name: transferEvents.name,
          expectedAmount: transferEvents.expectedAmount,
          expectedDate: transferEvents.expectedDate,
          status: transferEvents.status,
          sourceEnvelopeId: transferEvents.sourceEnvelopeId,
          sourcePoolId: transferEvents.sourceEnvelopeId,
          sourceEnvelopeName: sourceEnvelopes.name,
          sourcePoolName: sourceEnvelopes.name,
          sourceIsPrivate: sourceEnvelopes.isPrivate,
          sourceUserId: sourceEnvelopes.userId,
          sourceBankIsPrivate: sourceBankAccounts.isPrivate,
          sourceBankUserId: sourceBankAccounts.userId,
          destinationEnvelopeId: transferEvents.destinationEnvelopeId,
          destinationPoolId: transferEvents.destinationEnvelopeId,
          destinationEnvelopeName: destEnvelopes.name,
          destinationPoolName: destEnvelopes.name,
          destIsPrivate: destEnvelopes.isPrivate,
          destUserId: destEnvelopes.userId,
          destBankIsPrivate: destBankAccounts.isPrivate,
          destBankUserId: destBankAccounts.userId,
        })
        .from(transferEvents)
        .leftJoin(sourceEnvelopes, eq(transferEvents.sourceEnvelopeId, sourceEnvelopes.id))
        .leftJoin(sourceBankAccounts, eq(sourceEnvelopes.bankAccountId, sourceBankAccounts.id))
        .leftJoin(destEnvelopes, eq(transferEvents.destinationEnvelopeId, destEnvelopes.id))
        .leftJoin(destBankAccounts, eq(destEnvelopes.bankAccountId, destBankAccounts.id))
        .where(
          and(
            eq(transferEvents.tenantId, ctx.tenantId!),
            eq(transferEvents.appId, ctx.appId!),
            sql`${transferEvents.archivedAt} IS NULL`
          )
        );

      return rows.filter((r) => {
        if (r.sourceIsPrivate && r.sourceUserId !== ctx.userId) return false;
        if (r.sourceBankIsPrivate && r.sourceBankUserId !== ctx.userId) return false;
        if (r.destIsPrivate && r.destUserId !== ctx.userId) return false;
        if (r.destBankIsPrivate && r.destBankUserId !== ctx.userId) return false;
        return true;
      });
    }),

  createTransferSource: privateTenantProcedure
    .input(
      z.object({
        name: z.string().optional(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        sourceEnvelopeId: z.string().uuid().optional(),
        sourcePoolId: z.string().uuid().optional(),
        destinationEnvelopeId: z.string().uuid().optional(),
        destinationPoolId: z.string().uuid().optional(),
        startDate: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);

      const sourceId = (input.sourceEnvelopeId || input.sourcePoolId)!;
      const destId = (input.destinationEnvelopeId || input.destinationPoolId)!;

      if (!sourceId || !destId || sourceId === destId) {
        throw new Error("Source and destination envelopes must be specified and different.");
      }

      const [sourceEnv] = await ctx.db
        .select({
          id: envelopes.id,
          name: envelopes.name,
          isPrivate: envelopes.isPrivate,
          userId: envelopes.userId,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
        })
        .from(envelopes)
        .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
        .where(
          and(
            eq(envelopes.id, sourceId),
            eq(envelopes.tenantId, ctx.tenantId!),
            eq(envelopes.appId, ctx.appId!),
            sql`${envelopes.archivedAt} IS NULL`
          )
        )
        .limit(1);

      const [destEnv] = await ctx.db
        .select({
          id: envelopes.id,
          name: envelopes.name,
          isPrivate: envelopes.isPrivate,
          userId: envelopes.userId,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
        })
        .from(envelopes)
        .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
        .where(
          and(
            eq(envelopes.id, destId),
            eq(envelopes.tenantId, ctx.tenantId!),
            eq(envelopes.appId, ctx.appId!),
            sql`${envelopes.archivedAt} IS NULL`
          )
        )
        .limit(1);

      if (!sourceEnv || !destEnv) {
        throw new Error("Source or destination envelope not found.");
      }

      if (
        (sourceEnv.isPrivate && sourceEnv.userId !== ctx.userId) ||
        (sourceEnv.bankAccountIsPrivate && sourceEnv.bankAccountUserId !== ctx.userId)
      ) {
        throw new Error("Source envelope not found.");
      }

      if (
        (destEnv.isPrivate && destEnv.userId !== ctx.userId) ||
        (destEnv.bankAccountIsPrivate && destEnv.bankAccountUserId !== ctx.userId)
      ) {
        throw new Error("Destination envelope not found.");
      }

      const [tenantRecord] = await ctx.db
        .select({ timezone: (await import("@money-matters/db")).tenants.timezone })
        .from((await import("@money-matters/db")).tenants)
        .where(eq((await import("@money-matters/db")).tenants.id, ctx.tenantId!))
        .limit(1);
      const tenantTz = tenantRecord?.timezone || "Australia/Sydney";
      const { getTenantDateString } = await import("@money-matters/core");

      const transferName = input.name || `Transfer: ${sourceEnv.name} ➔ ${destEnv.name}`;
      const eventDate = input.startDate || getTenantDateString(new Date(), { timezone: tenantTz });

      const [insertedEvent] = await ctx.db
        .insert(transferEvents)
        .values({
          sourceEnvelopeId: sourceId,
          destinationEnvelopeId: destId,
          name: transferName,
          expectedDate: eventDate,
          expectedAmount: input.amount,
          status: "PENDING",
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();

      return {
        id: insertedEvent.id,
        firstEventId: insertedEvent.id,
        name: transferName,
        amount: input.amount,
        sourceEnvelopeId: sourceId,
        destinationEnvelopeId: destId,
        startDate: input.startDate || null,
      };
    }),

  deleteTransferEvent: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);

      const sourceEnvelopes = alias(envelopes, "sourceEnvelopes");
      const destEnvelopes = alias(envelopes, "destEnvelopes");
      const sourceBankAccounts = alias(bankAccounts, "sourceBankAccounts");
      const destBankAccounts = alias(bankAccounts, "destBankAccounts");

      const [evt] = await ctx.db
        .select({
          id: transferEvents.id,
          sourceIsPrivate: sourceEnvelopes.isPrivate,
          sourceUserId: sourceEnvelopes.userId,
          sourceBankIsPrivate: sourceBankAccounts.isPrivate,
          sourceBankUserId: sourceBankAccounts.userId,
          destIsPrivate: destEnvelopes.isPrivate,
          destUserId: destEnvelopes.userId,
          destBankIsPrivate: destBankAccounts.isPrivate,
          destBankUserId: destBankAccounts.userId,
        })
        .from(transferEvents)
        .leftJoin(sourceEnvelopes, eq(transferEvents.sourceEnvelopeId, sourceEnvelopes.id))
        .leftJoin(sourceBankAccounts, eq(sourceEnvelopes.bankAccountId, sourceBankAccounts.id))
        .leftJoin(destEnvelopes, eq(transferEvents.destinationEnvelopeId, destEnvelopes.id))
        .leftJoin(destBankAccounts, eq(destEnvelopes.bankAccountId, destBankAccounts.id))
        .where(
          and(
            eq(transferEvents.id, input.eventId),
            eq(transferEvents.tenantId, ctx.tenantId!),
            eq(transferEvents.appId, ctx.appId!)
          )
        );

      if (!evt) throw new Error("Transfer event not found.");
      if (
        (evt.sourceIsPrivate && evt.sourceUserId !== ctx.userId) ||
        (evt.sourceBankIsPrivate && evt.sourceBankUserId !== ctx.userId) ||
        (evt.destIsPrivate && evt.destUserId !== ctx.userId) ||
        (evt.destBankIsPrivate && evt.destBankUserId !== ctx.userId)
      ) {
        throw new Error("Transfer event not found.");
      }

      await ctx.db
        .update(transferEvents)
        .set({
          archivedAt: new Date(),
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

  updateTransferEvent: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        name: z.string().min(1).optional(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        expectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const updateData: {
        name?: string;
        expectedAmount?: string;
        expectedDate?: string;
        updatedAt: Date;
        updatedBy: string;
      } = {
        updatedAt: new Date(),
        updatedBy: ctx.userId!,
      };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.amount !== undefined) updateData.expectedAmount = input.amount;
      if (input.expectedDate !== undefined) updateData.expectedDate = input.expectedDate;

      await ctx.db
        .update(transferEvents)
        .set(updateData)
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
        name: z.string().optional(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        sourceEnvelopeId: z.string().uuid().optional(),
        sourcePoolId: z.string().uuid().optional(),
        destinationEnvelopeId: z.string().uuid().optional(),
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

      const transferName = input.name || evt.name;
      const sourceEnvelopeId = input.sourceEnvelopeId || input.sourcePoolId || evt.sourceEnvelopeId;
      const destinationEnvelopeId = input.destinationEnvelopeId || input.destinationPoolId || evt.destinationEnvelopeId;
      const amountToTransfer = input.amount || evt.expectedAmount;

      await moveMoneyCommand(
        {
          sourceEnvelopeId,
          destinationEnvelopeId,
          amount: amountToTransfer,
          note: transferName,
        },
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        ctx.db
      );

      await ctx.db
        .update(transferEvents)
        .set({
          status: "CONFIRMED",
          name: transferName,
          actualAmount: amountToTransfer,
          sourceEnvelopeId,
          destinationEnvelopeId,
          updatedAt: new Date(),
          updatedBy: ctx.userId!,
        })
        .where(eq(transferEvents.id, input.eventId));

      return { success: true, message: "Transfer completed successfully." };
    }),
};
