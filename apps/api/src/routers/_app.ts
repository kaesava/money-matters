import { router, tenantProcedure, authenticatedProcedure } from '../trpc/trpc.js';
import { db, tenants, userPreferences, incomeSources, incomeSourceSchedules, categories, incomeEvents, expenseSources, expenseSourceSchedules, expenseEvents, allocationPlans, allocationPlanLines, bankAccounts, transactionLedger } from "@money-matters/db";
import { and, eq, sql, desc, asc } from "drizzle-orm";
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
  generateBurstDates,
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
  UpdateIncomeSourceCommand,
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

  getUserPreferences: tenantProcedure
    .query(async ({ ctx }) => {
      const [pref] = await ctx.db
        .select()
        .from(userPreferences)
        .where(
          and(
            eq(userPreferences.userId, ctx.userId!),
            eq(userPreferences.tenantId, ctx.tenantId!)
          )
        );
      return pref || { quickActionsCollapsed: false };
    }),

  updateUserPreferences: tenantProcedure
    .input(
      z.object({
        quickActionsCollapsed: z.boolean().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(userPreferences)
        .where(
          and(
            eq(userPreferences.userId, ctx.userId!),
            eq(userPreferences.tenantId, ctx.tenantId!)
          )
        );

      if (existing) {
        const [updated] = await ctx.db
          .update(userPreferences)
          .set({
            quickActionsCollapsed: input.quickActionsCollapsed ?? existing.quickActionsCollapsed,
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.id, existing.id))
          .returning();
        return updated;
      } else {
        const [inserted] = await ctx.db
          .insert(userPreferences)
          .values({
            userId: ctx.userId!,
            tenantId: ctx.tenantId!,
            quickActionsCollapsed: input.quickActionsCollapsed ?? false,
          })
          .returning();
        return inserted;
      }
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

  listBankAccountsWithExpected: tenantProcedure
    .query(async ({ ctx }) => {
      const accounts = await ctx.db
        .select()
        .from(bankAccounts)
        .where(
          and(
            eq(bankAccounts.tenantId, ctx.tenantId!),
            eq(bankAccounts.appId, ctx.appId!),
            sql`${bankAccounts.archivedAt} IS NULL`
          )
        );

      const allCategories = await listCategoriesQuery(ctx.tenantId!, ctx.appId!, ctx.db);

      return accounts.map((acc) => {
        const linkedCats = allCategories.filter((c) => c.bankAccountId === acc.id);
        const expectedBalance = linkedCats.reduce((sum, c) => sum + parseFloat(c.currentBalance || "0"), 0);
        return {
          ...acc,
          expectedBalance: expectedBalance.toFixed(2),
          linkedCategoryCount: linkedCats.length,
        };
      });
    }),

  reconcileBankBalance: tenantProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        actualBalance: z.string().regex(/^\d+(\.\d{1,2})?$/),
        targetCategoryId: z.string().uuid().optional(),
        drawdowns: z.array(z.object({ categoryId: z.string().uuid(), amount: z.string() })).optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      const accountId = input.accountId;
      const actual = parseFloat(input.actualBalance);

      const allCategories = await listCategoriesQuery(ctx.tenantId!, ctx.appId!, ctx.db);
      const linkedCats = allCategories.filter((c) => c.bankAccountId === accountId);
      const expected = linkedCats.reduce((sum, c) => sum + parseFloat(c.currentBalance || "0"), 0);

      const diff = actual - expected;

      if (Math.abs(diff) < 0.01) {
        // Update actual balance
        await ctx.db
          .update(bankAccounts)
          .set({ lastKnownBalance: input.actualBalance, updatedAt: new Date(), updatedBy: ctx.userId! })
          .where(eq(bankAccounts.id, accountId));
        return { success: true, diff: 0 };
      }

      if (diff > 0) {
        // Surplus: allocate into target category or tenant default surplus category
        let surplusCatId = input.targetCategoryId;
        if (!surplusCatId) {
          const [t] = await ctx.db.select().from(tenants).where(eq(tenants.id, ctx.tenantId!));
          surplusCatId = t?.defaultSurplusCategoryId || undefined;
        }

        if (!surplusCatId) {
          // Fall back to first GOAL or EVERYDAY category
          const fallback = linkedCats.find((c) => c.type === "GOAL") || linkedCats.find((c) => c.type === "EVERYDAY") || allCategories[0];
          surplusCatId = fallback?.id;
        }

        if (!surplusCatId) throw new Error("No target category found to allocate surplus.");

        // Record CREDIT transaction
        await recordExpenseCommand(
          {
            categoryId: surplusCatId,
            amount: diff.toFixed(2),
            flowType: "CREDIT",
            source: "MANUAL",
            note: `Bank Reconciliation Surplus adjustment`,
            recordedAt: new Date().toISOString(),
          },
          ctx.tenantId!,
          ctx.appId!,
          ctx.userId!,
          ctx.db
        );

        // Update defaultSurplusCategoryId on tenant if user specified targetCategoryId
        if (input.targetCategoryId) {
          await ctx.db
            .update(tenants)
            .set({ defaultSurplusCategoryId: input.targetCategoryId })
            .where(eq(tenants.id, ctx.tenantId!));
        }
      } else {
        // Deficit: draw down from categories
        const drawdowns = input.drawdowns || [];
        if (drawdowns.length === 0) {
          // Automatic reverse priority drawdown (Everyday -> Goal -> Regular)
          let remainingDeficit = Math.abs(diff);
          const sortedCats = [...linkedCats].sort((a, b) => {
            const priorityMap = { EVERYDAY: 1, GOAL: 2, REGULAR: 3 };
            return priorityMap[a.type] - priorityMap[b.type];
          });

          for (const cat of sortedCats) {
            if (remainingDeficit <= 0.005) break;
            const catBalance = Math.max(0, parseFloat(cat.currentBalance));
            const takeAmount = Math.min(catBalance, remainingDeficit);
            if (takeAmount > 0) {
              await recordExpenseCommand(
                {
                  categoryId: cat.id,
                  amount: takeAmount.toFixed(2),
                  flowType: "DEBIT",
                  source: "MANUAL",
                  note: `Bank Reconciliation Deficit adjustment`,
                  recordedAt: new Date().toISOString(),
                },
                ctx.tenantId!,
                ctx.appId!,
                ctx.userId!,
                ctx.db
              );
              remainingDeficit -= takeAmount;
            }
          }
        } else {
          for (const dd of drawdowns) {
            await recordExpenseCommand(
              {
                categoryId: dd.categoryId,
                amount: dd.amount,
                flowType: "DEBIT",
                source: "MANUAL",
                note: `Bank Reconciliation Deficit adjustment`,
                recordedAt: new Date().toISOString(),
              },
              ctx.tenantId!,
              ctx.appId!,
              ctx.userId!,
              ctx.db
            );
          }
        }
      }

      // Update actual balance on bank account
      await ctx.db
        .update(bankAccounts)
        .set({ lastKnownBalance: input.actualBalance, updatedAt: new Date(), updatedBy: ctx.userId! })
        .where(eq(bankAccounts.id, accountId));

      return { success: true, diff };
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

  updateIncomeSource: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: UpdateIncomeSourceCommand,
    }).strict())
    .mutation(async ({ input, ctx }) => {
      const [updated] = await ctx.db
        .update(incomeSources)
        .set({
          name: input.data.name,
          type: input.data.type,
          amount: input.data.amount,
          receivingAccountId: input.data.receivingAccountId,
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
      if (!updated) {
        throw new Error("Income source not found or unauthorized.");
      }
      return updated;
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
        .select({
          id: incomeSources.id,
          name: incomeSources.name,
          type: incomeSources.type,
          amount: incomeSources.amount,
          receivingAccountId: incomeSources.receivingAccountId,
          scheduleId: incomeSourceSchedules.id,
          rrule: incomeSourceSchedules.rrule,
          startDate: incomeSourceSchedules.startDate,
          endDate: incomeSourceSchedules.endDate,
        })
        .from(incomeSources)
        .leftJoin(incomeSourceSchedules, eq(incomeSources.id, incomeSourceSchedules.incomeSourceId))
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
      const pendingEvents = await ctx.db
        .select()
        .from(incomeEvents)
        .where(
          and(
            eq(incomeEvents.incomeSourceId, input.id),
            eq(incomeEvents.status, "UPCOMING"),
            sql`${incomeEvents.archivedAt} IS NULL`
          )
        );

      if (pendingEvents.length > 0) {
        throw new Error("Cannot archive an income source that has upcoming income events scheduled.");
      }

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
        .orderBy(asc(incomeEvents.expectedDate));
    }),

  // 5. Expense Sources & Events
  listExpenseSources: tenantProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select({
          id: expenseSources.id,
          name: expenseSources.name,
          type: expenseSources.type,
          amount: expenseSources.amount,
          categoryId: expenseSources.categoryId,
          categoryName: categories.name,
          scheduleId: expenseSourceSchedules.id,
          rrule: expenseSourceSchedules.rrule,
          startDate: expenseSourceSchedules.startDate,
          endDate: expenseSourceSchedules.endDate,
        })
        .from(expenseSources)
        .leftJoin(categories, eq(expenseSources.categoryId, categories.id))
        .leftJoin(expenseSourceSchedules, eq(expenseSources.id, expenseSourceSchedules.expenseSourceId))
        .where(
          and(
            eq(expenseSources.tenantId, ctx.tenantId!),
            eq(expenseSources.appId, ctx.appId!),
            sql`${expenseSources.archivedAt} IS NULL`
          )
        );
    }),

  createExpenseSource: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(["UTILITY", "SUBSCRIPTION", "RENT_MORTGAGE", "INSURANCE", "OTHER"]),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        categoryId: z.string().uuid().optional(),
        isRecurring: z.boolean().default(true),
        startDate: z.string().optional(),
        frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      const [source] = await ctx.db
        .insert(expenseSources)
        .values({
          name: input.name,
          type: input.type,
          amount: input.amount,
          categoryId: input.categoryId || null,
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();

      if (input.isRecurring && input.startDate) {
        let rrule = "FREQ=MONTHLY";
        if (input.frequency === "WEEKLY") rrule = "FREQ=WEEKLY";
        else if (input.frequency === "FORTNIGHTLY") rrule = "FREQ=WEEKLY;INTERVAL=2";
        else if (input.frequency === "ANNUALLY") rrule = "FREQ=YEARLY";

        await ctx.db.insert(expenseSourceSchedules).values({
          expenseSourceId: source.id,
          rrule,
          startDate: input.startDate,
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        });

        // Burst 12 months of upcoming expense events
        const dates = generateBurstDates(rrule, input.startDate, null, 12);
        for (const d of dates) {
          await ctx.db.insert(expenseEvents).values({
            expenseSourceId: source.id,
            categoryId: input.categoryId || null,
            name: input.name,
            expectedDate: d.toISOString().split("T")[0],
            expectedAmount: input.amount,
            status: "UPCOMING",
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            createdBy: ctx.userId!,
            updatedBy: ctx.userId!,
          });
        }
      } else if (input.startDate) {
        // One-off expense event
        await ctx.db.insert(expenseEvents).values({
          expenseSourceId: source.id,
          categoryId: input.categoryId || null,
          name: input.name,
          expectedDate: input.startDate,
          expectedAmount: input.amount,
          status: "UPCOMING",
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        });
      }

      return source;
    }),

  updateExpenseSource: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          name: z.string().min(1).optional(),
          type: z.enum(["UTILITY", "SUBSCRIPTION", "RENT_MORTGAGE", "INSURANCE", "OTHER"]).optional(),
          amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
          categoryId: z.string().uuid().optional(),
        }).strict(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      const [updated] = await ctx.db
        .update(expenseSources)
        .set({
          name: input.data.name,
          type: input.data.type,
          amount: input.data.amount,
          categoryId: input.data.categoryId,
          updatedBy: ctx.userId!,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(expenseSources.id, input.id),
            eq(expenseSources.tenantId, ctx.tenantId!),
            eq(expenseSources.appId, ctx.appId!),
            sql`${expenseSources.archivedAt} IS NULL`
          )
        )
        .returning();
      if (!updated) throw new Error("Expense source not found.");
      return updated;
    }),

  archiveExpenseSource: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      const pendingEvents = await ctx.db
        .select()
        .from(expenseEvents)
        .where(
          and(
            eq(expenseEvents.expenseSourceId, input.id),
            eq(expenseEvents.status, "UPCOMING"),
            sql`${expenseEvents.archivedAt} IS NULL`
          )
        );

      if (pendingEvents.length > 0) {
        throw new Error("Cannot archive an expense source that has upcoming expense events scheduled.");
      }

      const [archived] = await ctx.db
        .update(expenseSources)
        .set({
          archivedAt: new Date(),
          updatedBy: ctx.userId!,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(expenseSources.id, input.id),
            eq(expenseSources.tenantId, ctx.tenantId!),
            eq(expenseSources.appId, ctx.appId!),
            sql`${expenseSources.archivedAt} IS NULL`
          )
        )
        .returning();
      return { success: true };
    }),

  listExpenseEvents: tenantProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select({
          id: expenseEvents.id,
          name: expenseEvents.name,
          expectedDate: expenseEvents.expectedDate,
          expectedAmount: expenseEvents.expectedAmount,
          actualAmount: expenseEvents.actualAmount,
          note: expenseEvents.note,
          status: expenseEvents.status,
          categoryId: expenseEvents.categoryId,
          categoryName: categories.name,
          expenseSourceId: expenseEvents.expenseSourceId,
        })
        .from(expenseEvents)
        .leftJoin(categories, eq(expenseEvents.categoryId, categories.id))
        .where(
          and(
            eq(expenseEvents.tenantId, ctx.tenantId!),
            eq(expenseEvents.appId, ctx.appId!),
            sql`${expenseEvents.archivedAt} IS NULL`
          )
        )
        .orderBy(asc(expenseEvents.expectedDate));
    }),

  createExpenseEvent: tenantProcedure
    .input(
      z.object({
        categoryId: z.string().uuid().optional(),
        name: z.string().min(1),
        expectedDate: z.string(),
        expectedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        note: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      const [evt] = await ctx.db
        .insert(expenseEvents)
        .values({
          categoryId: input.categoryId || null,
          name: input.name,
          expectedDate: input.expectedDate,
          expectedAmount: input.expectedAmount,
          note: input.note || null,
          status: "UPCOMING",
          tenantId: ctx.tenantId!,
          appId: ctx.appId!,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        })
        .returning();
      return evt;
    }),

  markExpensePaid: tenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        actualAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        note: z.string().optional(),
        recordedAt: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      const [evt] = await ctx.db
        .select()
        .from(expenseEvents)
        .where(
          and(
            eq(expenseEvents.id, input.eventId),
            eq(expenseEvents.tenantId, ctx.tenantId!),
            eq(expenseEvents.appId, ctx.appId!)
          )
        );

      if (!evt) throw new Error("Expense event not found.");

      const amountToPay = input.actualAmount || evt.expectedAmount;

      if (evt.categoryId) {
        // Record DEBIT transaction draw down
        await recordExpenseCommand(
          {
            categoryId: evt.categoryId,
            amount: amountToPay,
            flowType: "DEBIT",
            source: "MANUAL",
            note: input.note || evt.note || `Paid expense: ${evt.name}`,
            recordedAt: input.recordedAt || new Date().toISOString(),
          },
          ctx.tenantId!,
          ctx.appId!,
          ctx.userId!,
          ctx.db
        );
      }

      // Update expense event status to PAID
      await ctx.db
        .update(expenseEvents)
        .set({
          status: "PAID",
          actualAmount: amountToPay,
          updatedAt: new Date(),
          updatedBy: ctx.userId!,
        })
        .where(eq(expenseEvents.id, input.eventId));

      return { success: true, message: "Expense marked paid and moved to Transactions." };
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
