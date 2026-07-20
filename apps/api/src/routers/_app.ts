import { router, tenantProcedure, authenticatedProcedure } from '../trpc/trpc.js';
import { db, incomeSources, incomeSourceSchedules, categories, incomeEvents, allocationPlans, allocationPlanLines, bankAccounts } from "@money-matters/db";
import { and, eq, sql, desc } from "drizzle-orm";
import { 
  createTenantHandler,
  createBankAccountHandler,
  updateBankAccountHandler,
  archiveBankAccountHandler,
  getTenantHandler,
} from "@money-matters/capability-tenant";
import {
  createCategoryCommand,
  updateCategoryCommand,
  archiveCategoryCommand,
  restoreItemCommand,
  runAllocationCommand,
  listCategoriesQuery,
  getCategoryDetailQuery,
  getMonthlySummaryQuery,
  listArchivedItemsQuery,
  upsertCategoryScheduleCommand,
  moveMoneyCommand,
  confirmAllocationCommand,
  previewAllocationQuery,
} from "@money-matters/capability-budgeting";
import {
  recordExpenseCommand,
  listTransactionsQuery,
  listCategoryTransactionsQuery,
  canAffordQuery,
} from "@money-matters/capability-transactions";
import { 
  CreateTenantCommand,
  CreateBankAccountCommand,
  UpdateBankAccountCommand,
  CreateCategoryCommand,
  UpdateCategoryCommand,
  CreateCategoryScheduleCommand,
  CreateIncomeSourceCommand,
  CreateIncomeSourceScheduleCommand,
  CreateIncomeEventCommand,
  RecordExpenseCommand,
  ListTransactionsQuery,
  ListCategoryTransactionsQuery,
  CanAffordQuery,
  MoveMoneyCommand,
} from "@money-matters/types";
import { ConfirmAllocationInput } from "@money-matters/capability-budgeting";
import { registerDeviceTokenHandler, removeDeviceTokenHandler } from "@money-matters/capability-notifications";
import {
  listFileNotesHandler,
  getFileNoteDownloadUrlHandler,
  createPreSignedUploadUrlHandler,
  createFileNoteHandler,
  updateFileNoteCommentHandler,
  archiveFileNoteHandler,
  restoreFileNoteHandler,
  purgeFileNoteHandler
} from "@money-matters/capability-file-notes";
import { getPlaceSuggestionsHandler, getPlaceDetailsHandler } from "@money-matters/capability-geo";
import { z } from 'zod';

export const appRouter = router({
  // 1. Tenants
  createTenant: authenticatedProcedure
    .input(CreateTenantCommand)
    .mutation(async ({ input, ctx }) => {
      const appId = ctx.appId || ctx.session?.appId || "01908bde-34bb-7b19-a178-574211bc93aa";
      const handler = createTenantHandler(db);
      return await handler(input, appId, ctx.userId);
    }),

  getTenantStatus: authenticatedProcedure
    .query(async ({ ctx }) => {
      return {
        hasTenant: ctx.tenantId !== null,
        tenantId: ctx.tenantId,
      };
    }),

  getTenant: tenantProcedure
    .query(async ({ ctx }) => {
      const handler = getTenantHandler(ctx.db);
      return await handler(ctx.tenantId!, ctx.appId!);
    }),

  // 2. Bank Accounts
  createBankAccount: tenantProcedure
    .input(CreateBankAccountCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = createBankAccountHandler(ctx.db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  updateBankAccount: tenantProcedure
    .input(z.object({
      accountId: z.string().uuid(),
      data: UpdateBankAccountCommand
    }).strict())
    .mutation(async ({ input, ctx }) => {
      const handler = updateBankAccountHandler(ctx.db);
      return await handler(input.accountId, input.data, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  archiveBankAccount: tenantProcedure
    .input(z.object({ accountId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      const handler = archiveBankAccountHandler(ctx.db);
      return await handler(input.accountId, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  listBankAccounts: tenantProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select()
        .from(bankAccounts)
        .where(
          and(
            eq(bankAccounts.tenantId, ctx.tenantId!),
            eq(bankAccounts.appId, ctx.appId!),
            sql`${bankAccounts.archivedAt} IS NULL`
          )
        );
    }),

  // 3. Categories
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

  // 4. Income Sources & Events
  createIncomeSource: tenantProcedure
    .input(CreateIncomeSourceCommand)
    .mutation(async ({ input, ctx }) => {
      const [source] = await ctx.db
        .insert(incomeSources)
        .values({
          name: input.name,
          type: input.type,
          amount: input.amount,
          receivingAccountId: input.receivingAccountId || null,
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();
      return source;
    }),

  createIncomeSourceSchedule: tenantProcedure
    .input(CreateIncomeSourceScheduleCommand)
    .mutation(async ({ input, ctx }) => {
      const [schedule] = await ctx.db
        .insert(incomeSourceSchedules)
        .values({
          incomeSourceId: input.incomeSourceId,
          rrule: input.rrule,
          startDate: input.startDate,
          endDate: input.endDate || null,
          occurrenceCount: input.occurrenceCount || null,
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();
      return schedule;
    }),

  createIncomeEvent: tenantProcedure
    .input(CreateIncomeEventCommand)
    .mutation(async ({ input, ctx }) => {
      const [event] = await ctx.db
        .insert(incomeEvents)
        .values({
          incomeSourceId: input.incomeSourceId,
          expectedDate: input.expectedDate,
          expectedAmount: input.expectedAmount,
          status: "UPCOMING",
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();
      return event;
    }),

  generateNextIncomeEvents: tenantProcedure
    .mutation(async ({ ctx }) => {
      const schedules = await ctx.db
        .select()
        .from(incomeSources)
        .where(
          and(
            eq(incomeSources.tenantId, ctx.tenantId!),
            eq(incomeSources.appId, ctx.appId!),
            sql`${incomeSources.archivedAt} IS NULL`
          )
        );

      const todayStr = new Date().toISOString().split('T')[0];

      for (const source of schedules) {
        const [existing] = await ctx.db
          .select()
          .from(incomeEvents)
          .where(
            and(
              eq(incomeEvents.incomeSourceId, source.id),
              eq(incomeEvents.expectedDate, todayStr)
            )
          );

        if (!existing) {
          await ctx.db.insert(incomeEvents).values({
            incomeSourceId: source.id,
            expectedAmount: source.amount,
            expectedDate: todayStr,
            status: "UPCOMING",
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            createdBy: ctx.userId!,
            updatedBy: ctx.userId!,
          });
        }
      }

      return { success: true, generated: schedules.length };
    }),

  listIncomeSources: tenantProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select()
        .from(incomeSources)
        .where(
          and(
            eq(incomeSources.tenantId, ctx.tenantId!),
            eq(incomeSources.appId, ctx.appId!),
            sql`${incomeSources.archivedAt} IS NULL`
          )
        );
    }),

  archiveIncomeSource: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      const [archived] = await ctx.db
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
      return { success: true };
    }),

  listIncomeEvents: tenantProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select({
          id: incomeEvents.id,
          expectedDate: incomeEvents.expectedDate,
          expectedAmount: incomeEvents.expectedAmount,
          actualAmount: incomeEvents.actualAmount,
          status: incomeEvents.status,
          incomeSourceId: incomeEvents.incomeSourceId,
          sourceName: incomeSources.name,
          sourceType: incomeSources.type,
        })
        .from(incomeEvents)
        .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
        .where(
          and(
            eq(incomeEvents.tenantId, ctx.tenantId!),
            eq(incomeEvents.appId, ctx.appId!),
            sql`${incomeEvents.archivedAt} IS NULL`
          )
        )
        .orderBy(desc(incomeEvents.expectedDate));
    }),

  listAllocationPlan: tenantProcedure
    .input(z.object({ incomeEventId: z.string().uuid() }).strict())
    .query(async ({ input, ctx }) => {
      const [plan] = await ctx.db
        .select()
        .from(allocationPlans)
        .where(
          and(
            eq(allocationPlans.incomeEventId, input.incomeEventId),
            eq(allocationPlans.tenantId, ctx.tenantId!),
            eq(allocationPlans.appId, ctx.appId!),
            sql`${allocationPlans.archivedAt} IS NULL`
          )
        )
        .orderBy(desc(allocationPlans.createdAt))
        .limit(1);

      if (!plan) return null;

      const lines = await ctx.db
        .select({
          id: allocationPlanLines.id,
          categoryId: allocationPlanLines.categoryId,
          proposedAmount: allocationPlanLines.proposedAmount,
          confirmedAmount: allocationPlanLines.confirmedAmount,
          reasoning: allocationPlanLines.reasoning,
          categoryName: categories.name,
        })
        .from(allocationPlanLines)
        .leftJoin(categories, eq(categories.id, allocationPlanLines.categoryId))
        .where(eq(allocationPlanLines.planId, plan.id));

      return {
        ...plan,
        lines: lines.map(l => ({ ...l, categoryName: l.categoryName ?? "Unknown" })),
      };
    }),

  runAllocation: tenantProcedure
    .input(
      z.object({
        incomeAmount: z.number().positive(),
        incomeEventId: z.string().uuid(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      return await runAllocationCommand(
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        input.incomeEventId,
        input.incomeAmount,
        ctx.db
      );
    }),

  previewAllocation: tenantProcedure
    .input(
      z.object({
        incomeEventId: z.string().uuid(),
        incomeAmount: z.number().positive(),
      }).strict()
    )
    .query(async ({ input, ctx }) => {
      return await previewAllocationQuery(
        ctx.tenantId!,
        ctx.appId!,
        input.incomeEventId,
        input.incomeAmount,
        ctx.db
      );
    }),

  confirmAllocation: tenantProcedure
    .input(ConfirmAllocationInput)
    .mutation(async ({ input, ctx }) => {
      return await confirmAllocationCommand(
        input,
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        ctx.db
      );
    }),

  recordExpense: tenantProcedure
    .input(RecordExpenseCommand)
    .mutation(async ({ input, ctx }) => {
      return await recordExpenseCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  listTransactions: tenantProcedure
    .input(ListTransactionsQuery)
    .query(async ({ input, ctx }) => {
      return await listTransactionsQuery(ctx.tenantId!, ctx.appId!, input.limit, input.offset, ctx.db);
    }),

  listCategoryTransactions: tenantProcedure
    .input(ListCategoryTransactionsQuery)
    .query(async ({ input, ctx }) => {
      return await listCategoryTransactionsQuery(input.categoryId, ctx.tenantId!, ctx.appId!, input.limit, input.offset, ctx.db);
    }),

  canAfford: tenantProcedure
    .input(CanAffordQuery)
    .query(async ({ input, ctx }) => {
      const amt = parseFloat(input.amount);
      return await canAffordQuery(amt, ctx.tenantId!, ctx.appId!, ctx.db);
    }),

  // 6. Push Notifications
  registerToken: tenantProcedure
    .input(
      z.object({
        platform: z.enum(['ios', 'android', 'web']),
        token: z.string().min(1, 'Push token is required'),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      const handler = registerDeviceTokenHandler(ctx.db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  removeToken: tenantProcedure
    .input(
      z.object({
        platform: z.enum(['ios', 'android', 'web']),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      const handler = removeDeviceTokenHandler(ctx.db);
      return await handler(input, ctx.tenantId!, ctx.userId!);
    }),

  // 7. File Notes
  listFileNotes: tenantProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string().uuid(),
        status: z.enum(['ACTIVE', 'ARCHIVED', 'ALL']).default('ACTIVE'),
      }).strict()
    )
    .query(async ({ ctx, input }) => {
      const handler = listFileNotesHandler(ctx.db);
      return await handler(input, ctx.tenantId!);
    }),

  getFileNoteDownloadUrl: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .query(async ({ ctx, input }) => {
      const handler = getFileNoteDownloadUrlHandler();
      return await handler(input.id, ctx.tenantId!, ctx.db);
    }),

  createPreSignedUploadUrl: tenantProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string().uuid(),
        fileName: z.string(),
        fileMimeType: z.string(),
        fileSize: z.number().int().min(1),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      const handler = createPreSignedUploadUrlHandler();
      return await handler(input, ctx.tenantId!);
    }),

  createFileNote: tenantProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string().uuid(),
        comment: z.string().max(2048).optional(),
        attachment: z
          .object({
            fileKey: z.string(),
            fileName: z.string(),
            fileMimeType: z.string(),
            fileSize: z.number().int(),
          }).strict()
          .optional(),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      const handler = createFileNoteHandler(ctx.db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  updateFileNoteComment: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        comment: z.string().max(2048),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      const handler = updateFileNoteCommentHandler(ctx.db);
      return await handler(input, ctx.tenantId!, ctx.userId!);
    }),

  archiveFileNote: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      const handler = archiveFileNoteHandler(ctx.db);
      return await handler(input.id, ctx.tenantId!, ctx.userId!);
    }),

  restoreFileNote: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      const handler = restoreFileNoteHandler(ctx.db);
      return await handler(input.id, ctx.tenantId!, ctx.userId!);
    }),

  purgeFileNote: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      const handler = purgeFileNoteHandler(ctx.db);
      return await handler(input.id, ctx.tenantId!);
    }),

  // 8. Geo/Location suggestions
  getPlaceSuggestions: tenantProcedure
    .input(
      z.object({
        query: z.string().min(2),
        countries: z.array(z.string()).default(['AU', 'NZ']),
      }).strict()
    )
    .query(async ({ input }) => {
      return await getPlaceSuggestionsHandler(input);
    }),

  getPlaceDetails: tenantProcedure
    .input(
      z.object({
        placeId: z.string(),
      }).strict()
    )
    .query(async ({ input }) => {
      return await getPlaceDetailsHandler(input.placeId);
    }),
});

export type AppRouter = typeof appRouter;
