import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import {
  createEnvelopeCommand,
  updateEnvelopeCommand,
  archiveEnvelopeCommand,
  listEnvelopesQuery,
  moveMoneyCommand,
  restoreItemCommand,
  getMonthlySummaryQuery,
  listArchivedItemsQuery,
  getProjectedPoolBalancesQuery,
  saveSetupBudgetHandler,
  getHomeSummaryQuery,
} from "@money-matters/capability-budgeting";
import {
  CreateEnvelopeCommand,
  UpdateEnvelopeCommand,
  MoveMoneyCommand,
  SaveSetupBudgetCommand,
} from "@money-matters/types";
import { z } from 'zod';

export const budgetingRouter = {
  // Envelope procedures (primary API)
  createEnvelope: privateTenantProcedure
    .input(CreateEnvelopeCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await createEnvelopeCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  updateEnvelope: privateTenantProcedure
    .input(z.object({
      envelopeId: z.string().uuid(),
      data: UpdateEnvelopeCommand
    }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await updateEnvelopeCommand(input.envelopeId, input.data, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  archiveEnvelope: privateTenantProcedure
    .input(z.object({ envelopeId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      await archiveEnvelopeCommand(input.envelopeId, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
      return { success: true };
    }),

  listEnvelopes: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await listEnvelopesQuery(ctx.tenantId!, ctx.appId!, ctx.db, ctx.userId);
    }),

  // Backward-compatible pool aliases for clients still transitioning
  createPool: privateTenantProcedure
    .input(CreateEnvelopeCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await createEnvelopeCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  updatePool: privateTenantProcedure
    .input(z.object({
      poolId: z.string().uuid(),
      data: UpdateEnvelopeCommand
    }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await updateEnvelopeCommand(input.poolId, input.data, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  archivePool: privateTenantProcedure
    .input(z.object({ poolId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      await archiveEnvelopeCommand(input.poolId, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
      return { success: true };
    }),

  listPools: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await listEnvelopesQuery(ctx.tenantId!, ctx.appId!, ctx.db, ctx.userId);
    }),

  moveMoney: privateTenantProcedure
    .input(MoveMoneyCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await moveMoneyCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  listArchivedItems: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await listArchivedItemsQuery(ctx.tenantId!, ctx.appId!, ctx.db, ctx.userId!);
    }),

  restoreItem: privateTenantProcedure
    .input(
      z.object({
        itemId: z.string().uuid(),
        itemType: z.enum(["ENVELOPE", "POOL", "CATEGORY", "INCOME_SOURCE", "BANK_ACCOUNT"]),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const normalizedType = (input.itemType === "POOL" || input.itemType === "CATEGORY") ? "ENVELOPE" : input.itemType;
      const result = await restoreItemCommand(
        input.itemId,
        normalizedType,
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        ctx.db
      );
      if (!result) {
        throw new Error("Item not found or access unauthorized.");
      }
      return { success: true };
    }),

  getMonthlySummary: privateTenantProcedure
    .input(
      z.object({
        year: z.number().int().min(2000).max(2100),
        month: z.number().int().min(1).max(12),
      }).strict()
    )
    .query(async ({ input, ctx }) => {
      return await getMonthlySummaryQuery(input.year, input.month, ctx.tenantId!, ctx.appId!, ctx.db);
    }),

  getProjectedPoolBalances: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await getProjectedPoolBalancesQuery(ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  saveSetupBudget: privateTenantProcedure
    .input(SaveSetupBudgetCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const handler = saveSetupBudgetHandler(ctx.db);
      return await handler(input, ctx.appId!, ctx.userId!, ctx.tenantId!);
    }),

  getHomeSummary: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await getHomeSummaryQuery(ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),
};
