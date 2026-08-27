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
  upsertCategoryScheduleCommand,
  moveMoneyCommand,
  reSetupBudget,
  evaluateBillsPoolHealth,
} from "@money-matters/capability-budgeting";
import {
  CreateCategoryCommand,
  UpdateCategoryCommand,
  CreateCategoryScheduleCommand,
  MoveMoneyCommand,
  BillCoverageResultSchema,
} from "@money-matters/types";
import { z } from 'zod';
import { posthog } from '../lib/posthog.js';

import { ensurePremiumAccess } from '@money-matters/capability-billing';

export const categoriesRouter = {
  createCategory: privateTenantProcedure
    .input(CreateCategoryCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      if (input.isPrivate) {
        await ensurePremiumAccess(ctx.db, ctx.tenantId!, "Private pools");
      }
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

  createCategorySchedule: privateTenantProcedure
    .input(CreateCategoryScheduleCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await upsertCategoryScheduleCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
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

  listArchivedItems: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await listArchivedItemsQuery(ctx.tenantId!, ctx.appId!, ctx.db);
    }),

  restoreItem: privateTenantProcedure
    .input(
      z.object({
        itemId: z.string().uuid(),
        itemType: z.enum(["CATEGORY", "INCOME_SOURCE", "EXPENSE_SOURCE", "BANK_ACCOUNT"]),
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

  listCategories: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await listCategoriesQuery(ctx.tenantId!, ctx.appId!, ctx.db, ctx.userId!);
    }),

  listBillCoverage: privateTenantProcedure
    .output(BillCoverageResultSchema)
    .query(async ({ ctx }) => {
      return await listBillCoverageQuery(ctx.tenantId!, ctx.appId!, ctx.db, ctx.userId!);
    }),

  getMonthlySummary: privateTenantProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }).strict())
    .query(async ({ input, ctx }) => {
      return await getMonthlySummaryQuery(input.year, input.month, ctx.tenantId!, ctx.appId!, ctx.db);
    }),

  reSetupBudget: privateTenantProcedure
    .input(z.object({
      everydayTargetCap: z.number().nonnegative(),
      billsTargetCap: z.number().nonnegative(),
      categoriesList: z.array(z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        type: z.enum(["EVERYDAY", "REGULAR", "GOAL"]),
        monthlyAmount: z.number().nullable().optional(),
        targetAmount: z.number().nullable().optional(),
        targetDate: z.string().nullable().optional(),
        dueDate: z.string().nullable().optional(),
        isEssential: z.boolean().optional(),
      }).strict()),
    }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await reSetupBudget(ctx.db, {
        tenantId: ctx.tenantId!,
        userId: ctx.userId!,
        ...input,
      });
    }),

  evaluateDueGuardrail: privateTenantProcedure
    .input(z.object({
      currentBillsPoolBalance: z.number().optional(),
      upcomingBills: z.array(z.object({
        id: z.string(),
        name: z.string(),
        amount: z.number(),
        dueDate: z.string(),
      }).strict()).optional(),
      lookaheadDays: z.number().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      let balance = input?.currentBillsPoolBalance;
      let bills = input?.upcomingBills;

      if (balance === undefined || bills === undefined) {
        const categoriesList = await listCategoriesQuery(ctx.tenantId!, ctx.appId!, ctx.db);
        const billsCat = categoriesList.find((c) => c.type === 'REGULAR' || c.name.toLowerCase().includes('bill'));
        balance = balance ?? (billsCat ? parseFloat(billsCat.currentBalance) : 0);

        if (bills === undefined) {
          const upcomingEvents = (await ctx.db.query?.expenseEvents?.findMany?.({
            where: (e, { eq, and }) => and(
              eq(e.tenantId, ctx.tenantId!),
              eq(e.appId, ctx.appId!),
              eq(e.status, 'UPCOMING')
            ),
          })) ?? [];

          bills = upcomingEvents.map((e: Record<string, unknown>) => ({
            id: String(e.id),
            name: String(e.name || ''),
            amount: parseFloat(String(e.expectedAmount || '0')),
            dueDate: String(e.expectedDate || ''),
          }));
        }

      }

      return evaluateBillsPoolHealth({
        currentBillsPoolBalance: balance,
        upcomingBills: bills,
        lookaheadDays: input?.lookaheadDays ?? 14,
      });
    }),
};
