import { tenantProcedure } from '../trpc/trpc.js';
import {
  createCategoryCommand,
  updateCategoryCommand,
  archiveCategoryCommand,
  restoreItemCommand,
  listCategoriesQuery,
  getMonthlySummaryQuery,
  listArchivedItemsQuery,
  upsertCategoryScheduleCommand,
  moveMoneyCommand,
} from "@money-matters/capability-budgeting";
import {
  CreateCategoryCommand,
  UpdateCategoryCommand,
  CreateCategoryScheduleCommand,
  MoveMoneyCommand,
} from "@money-matters/types";
import { z } from 'zod';

export const categoriesRouter = {
  createCategory: tenantProcedure
    .input(CreateCategoryCommand)
    .mutation(async ({ input, ctx }) => {
      return await createCategoryCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  updateCategory: tenantProcedure
    .input(z.object({
      categoryId: z.string().uuid(),
      data: UpdateCategoryCommand
    }).strict())
    .mutation(async ({ input, ctx }) => {
      return await updateCategoryCommand(input.categoryId, input.data, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  createCategorySchedule: tenantProcedure
    .input(CreateCategoryScheduleCommand)
    .mutation(async ({ input, ctx }) => {
      return await upsertCategoryScheduleCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  archiveCategory: tenantProcedure
    .input(z.object({ categoryId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      const result = await archiveCategoryCommand(input.categoryId, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
      if (!result) {
        throw new Error("Category not found or access unauthorized.");
      }
      return { success: true };
    }),

  moveMoney: tenantProcedure
    .input(MoveMoneyCommand)
    .mutation(async ({ input, ctx }) => {
      return await moveMoneyCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  listArchivedItems: tenantProcedure
    .query(async ({ ctx }) => {
      return await listArchivedItemsQuery(ctx.tenantId!, ctx.appId!, ctx.db);
    }),

  restoreItem: tenantProcedure
    .input(
      z.object({
        itemId: z.string().uuid(),
        itemType: z.enum(["CATEGORY", "INCOME_SOURCE", "BANK_ACCOUNT"]),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
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

  listCategories: tenantProcedure
    .query(async ({ ctx }) => {
      return await listCategoriesQuery(ctx.tenantId!, ctx.appId!, ctx.db);
    }),

  getMonthlySummary: tenantProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }).strict())
    .query(async ({ input, ctx }) => {
      return await getMonthlySummaryQuery(input.year, input.month, ctx.tenantId!, ctx.appId!, ctx.db);
    }),
};
