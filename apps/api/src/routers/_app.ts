import { router, tenantProcedure, ownerProcedure, publicProcedure, authenticatedProcedure } from '../trpc/trpc.js';
import { db } from "@money-matters/db";
import { 
  createTenantHandler,
  createBankAccountHandler,
  updateBankAccountHandler,
  archiveBankAccountHandler,
  getTenantHandler
} from "@money-matters/capability-tenant";
import {
  createCategoryHandler,
  updateCategoryHandler,
  createCategoryScheduleHandler,
  createIncomeSourceHandler,
  createIncomeSourceScheduleHandler,
  createIncomeEventHandler,
  calculatePaydayCascade,
  confirmPaydayAllocationPlan,
  recordExpenseHandler,
  resolveShortfallHandler,
  listCategoriesWithHealth
} from "@money-matters/capability-money";
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
  ConfirmPlanCommand,
  RecordExpenseCommand,
  ResolveShortfallCommand
} from "@money-matters/types";
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
      // appId: prefer one already on session (existing member), fall back to registered app constant
      const appId = ctx.appId || ctx.session?.appId || "01908bde-34bb-7b19-a178-574211bc93aa";
      const handler = createTenantHandler(db);
      // userId comes from the verified JWT — never from client input
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
      const handler = getTenantHandler(db);
      return await handler(ctx.tenantId!, ctx.appId!);
    }),

  // 2. Bank Accounts
  createBankAccount: tenantProcedure
    .input(CreateBankAccountCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = createBankAccountHandler(db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  updateBankAccount: tenantProcedure
    .input(z.object({
      accountId: z.string().uuid(),
      data: UpdateBankAccountCommand
    }).strict())
    .mutation(async ({ input, ctx }) => {
      const handler = updateBankAccountHandler(db);
      return await handler(input.accountId, input.data, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  archiveBankAccount: tenantProcedure
    .input(z.object({ accountId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      const handler = archiveBankAccountHandler(db);
      return await handler(input.accountId, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  // 3. Categories
  createCategory: tenantProcedure
    .input(CreateCategoryCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = createCategoryHandler(db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  updateCategory: tenantProcedure
    .input(z.object({
      categoryId: z.string().uuid(),
      data: UpdateCategoryCommand
    }).strict())
    .mutation(async ({ input, ctx }) => {
      const handler = updateCategoryHandler(db);
      return await handler(input.categoryId, input.data, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  listCategories: tenantProcedure
    .query(async ({ ctx }) => {
      const handler = listCategoriesWithHealth(db);
      return await handler(ctx.tenantId!, ctx.appId!);
    }),

  createCategorySchedule: tenantProcedure
    .input(CreateCategoryScheduleCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = createCategoryScheduleHandler(db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  // 4. Income Sources & Events
  createIncomeSource: tenantProcedure
    .input(CreateIncomeSourceCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = createIncomeSourceHandler(db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  createIncomeSourceSchedule: tenantProcedure
    .input(CreateIncomeSourceScheduleCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = createIncomeSourceScheduleHandler(db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  createIncomeEvent: tenantProcedure
    .input(CreateIncomeEventCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = createIncomeEventHandler(db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  // 5. Allocation Engine cascade trigger
  executeCascade: tenantProcedure
    .input(
      z.object({
        incomeAmount: z.number().positive(),
        incomeEventId: z.string().uuid(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      return await calculatePaydayCascade(
        ctx.tenantId!,
        ctx.appId!,
        input.incomeAmount,
        input.incomeEventId
      );
    }),

  confirmPlan: tenantProcedure
    .input(ConfirmPlanCommand)
    .mutation(async ({ input, ctx }) => {
      return await confirmPaydayAllocationPlan(
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        input.planId,
        input.lines
      );
    }),

  recordExpense: tenantProcedure
    .input(RecordExpenseCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = recordExpenseHandler(db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  resolveShortfall: tenantProcedure
    .input(ResolveShortfallCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = resolveShortfallHandler(db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
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
      const handler = registerDeviceTokenHandler(db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  removeToken: tenantProcedure
    .input(
      z.object({
        platform: z.enum(['ios', 'android', 'web']),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      const handler = removeDeviceTokenHandler(db);
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
      const handler = listFileNotesHandler(db);
      return await handler(input, ctx.tenantId!);
    }),

  getFileNoteDownloadUrl: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .query(async ({ ctx, input }) => {
      const handler = getFileNoteDownloadUrlHandler();
      return await handler(input.id, ctx.tenantId!, db);
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
      const handler = createFileNoteHandler(db);
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
      const handler = updateFileNoteCommentHandler(db);
      return await handler(input, ctx.tenantId!, ctx.userId!);
    }),

  archiveFileNote: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      const handler = archiveFileNoteHandler(db);
      return await handler(input.id, ctx.tenantId!, ctx.userId!);
    }),

  restoreFileNote: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      const handler = restoreFileNoteHandler(db);
      return await handler(input.id, ctx.tenantId!, ctx.userId!);
    }),

  purgeFileNote: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      const handler = purgeFileNoteHandler(db);
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
