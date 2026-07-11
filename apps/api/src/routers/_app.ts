import { router, tenantProcedure, ownerProcedure, publicProcedure } from '../trpc/trpc.js';
import { db } from "@money-matters/db";
import { 
  createHouseholdHandler,
  createBankAccountHandler,
  updateBankAccountHandler,
  archiveBankAccountHandler,
  getHouseholdHandler
} from "@money-matters/capability-household";
import {
  createCategoryHandler,
  updateCategoryHandler,
  createCategoryScheduleHandler,
  createIncomeSourceHandler,
  createIncomeSourceScheduleHandler,
  createIncomeEventHandler,
  calculatePaydayCascade
} from "@money-matters/capability-money";
import { 
  CreateHouseholdCommand,
  CreateBankAccountCommand,
  UpdateBankAccountCommand,
  CreateCategoryCommand,
  UpdateCategoryCommand,
  CreateCategoryScheduleCommand,
  CreateIncomeSourceCommand,
  CreateIncomeSourceScheduleCommand,
  CreateIncomeEventCommand
} from "@money-matters/types";
import { z } from 'zod';

export const appRouter = router({
  // 1. Households
  createHousehold: publicProcedure
    .input(CreateHouseholdCommand)
    .mutation(async ({ input, ctx }) => {
      // In V1, appId defaults to config ID
      const appId = ctx.appId || "01908bde-34bb-7b19-a178-574211bc93aa";
      const handler = createHouseholdHandler(db);
      return await handler(input, appId);
    }),

  getHousehold: tenantProcedure
    .query(async ({ ctx }) => {
      const handler = getHouseholdHandler(db);
      return await handler(ctx.tenantId, ctx.appId);
    }),

  // 2. Bank Accounts
  createBankAccount: tenantProcedure
    .input(CreateBankAccountCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = createBankAccountHandler(db);
      return await handler(input, ctx.tenantId, ctx.appId, ctx.userId);
    }),

  updateBankAccount: tenantProcedure
    .input(z.object({
      accountId: z.string().uuid(),
      data: UpdateBankAccountCommand
    }).strict())
    .mutation(async ({ input, ctx }) => {
      const handler = updateBankAccountHandler(db);
      return await handler(input.accountId, input.data, ctx.tenantId, ctx.appId, ctx.userId);
    }),

  archiveBankAccount: tenantProcedure
    .input(z.object({ accountId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      const handler = archiveBankAccountHandler(db);
      return await handler(input.accountId, ctx.tenantId, ctx.appId, ctx.userId);
    }),

  // 3. Categories
  createCategory: tenantProcedure
    .input(CreateCategoryCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = createCategoryHandler(db);
      return await handler(input, ctx.tenantId, ctx.appId, ctx.userId);
    }),

  updateCategory: tenantProcedure
    .input(z.object({
      categoryId: z.string().uuid(),
      data: UpdateCategoryCommand
    }).strict())
    .mutation(async ({ input, ctx }) => {
      const handler = updateCategoryHandler(db);
      return await handler(input.categoryId, input.data, ctx.tenantId, ctx.appId, ctx.userId);
    }),

  createCategorySchedule: tenantProcedure
    .input(CreateCategoryScheduleCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = createCategoryScheduleHandler(db);
      return await handler(input, ctx.tenantId, ctx.appId, ctx.userId);
    }),

  // 4. Income Sources & Events
  createIncomeSource: tenantProcedure
    .input(CreateIncomeSourceCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = createIncomeSourceHandler(db);
      return await handler(input, ctx.tenantId, ctx.appId, ctx.userId);
    }),

  createIncomeSourceSchedule: tenantProcedure
    .input(CreateIncomeSourceScheduleCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = createIncomeSourceScheduleHandler(db);
      return await handler(input, ctx.tenantId, ctx.appId, ctx.userId);
    }),

  createIncomeEvent: tenantProcedure
    .input(CreateIncomeEventCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = createIncomeEventHandler(db);
      return await handler(input, ctx.tenantId, ctx.appId, ctx.userId);
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
        ctx.tenantId,
        ctx.appId,
        input.incomeAmount,
        input.incomeEventId
      );
    }),
});

export type AppRouter = typeof appRouter;
