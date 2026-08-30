import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import {
  createCategoryCommand,
  updateCategoryCommand,
  archiveCategoryCommand,
  restoreItemCommand,
  listCategoriesQuery,
  listBillCoverageQuery,
  getMonthlySummaryQuery,
  listArchivedItemsQuery,
  moveMoneyCommand,
  reSetupBudget,
} from "@money-matters/capability-budgeting";
import {
  CreateCategoryCommand,
  UpdateCategoryCommand,
  MoveMoneyCommand,
  ReSetupBudgetInputSchema,
} from "@money-matters/types";
import { z } from 'zod';
import { posthog } from '../lib/posthog.js';

export const categoriesRouter = {
  createCategory: privateTenantProcedure
    .input(CreateCategoryCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await createCategoryCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  updateCategory: privateTenantProcedure
    .input(z.object({
      categoryId: z.string().uuid(),
      data: UpdateCategoryCommand
    }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await updateCategoryCommand(input.categoryId, input.data, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  archiveCategory: privateTenantProcedure
    .input(z.object({ categoryId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const result = await archiveCategoryCommand(input.categoryId, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
      if (!result) {
        throw new Error("Category not found or access unauthorized.");
      }
      return { success: true };
    }),

  moveMoney: privateTenantProcedure
    .input(MoveMoneyCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const result = await moveMoneyCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'money_moved',
          properties: {
            tenant_id: ctx.tenantId,
            amount: input.amount,
          },
        });
        await posthog.flush();
      }
      return result;
    }),

  listCategories: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await listCategoriesQuery(ctx.tenantId!, ctx.appId!, ctx.db, ctx.userId!);
    }),

  listArchivedItems: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await listArchivedItemsQuery(ctx.tenantId!, ctx.appId!, ctx.db);
    }),

  restoreItem: privateTenantProcedure
    .input(
      z.object({
        itemId: z.string().uuid(),
        itemType: z.enum(["POOL", "CATEGORY", "INCOME_SOURCE", "EXPENSE_SOURCE", "BANK_ACCOUNT"]),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const result = await restoreItemCommand(
        input.itemId,
        input.itemType,
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

  listBillCoverage: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await listBillCoverageQuery(ctx.tenantId!, ctx.appId!, ctx.db, ctx.userId!);
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

  reSetupBudget: privateTenantProcedure
    .input(ReSetupBudgetInputSchema)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await reSetupBudget(ctx.db, input);
    }),
};
