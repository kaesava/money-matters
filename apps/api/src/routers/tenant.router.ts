import { tenantProcedure, authenticatedProcedure } from '../trpc/trpc.js';
import { db, userPreferences, bankAccounts } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { 
  createTenantHandler,
  createBankAccountHandler,
  updateBankAccountHandler,
  archiveBankAccountHandler,
  getTenantHandler,
} from "@money-matters/capability-tenant";
import {
  listCategoriesQuery,
} from "@money-matters/capability-budgeting";
import {
  recordExpenseCommand,
} from "@money-matters/capability-transactions";
import { 
  CreateTenantCommand,
  CreateBankAccountCommand,
  UpdateBankAccountCommand,
} from "@money-matters/types";
import { z } from 'zod';

export const tenantRouter = {
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
      return pref || { quickActionsCollapsed: false, timezone: "Australia/Sydney" };
    }),

  updateUserPreferences: tenantProcedure
    .input(
      z.object({
        quickActionsCollapsed: z.boolean().optional(),
        timezone: z.string().optional(),
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
            timezone: input.timezone ?? existing.timezone,
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
            timezone: input.timezone ?? "Australia/Sydney",
          })
          .returning();
        return inserted;
      }
    }),

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
        const buffer = parseFloat(acc.unbudgetedBuffer || "0");
        const expectedBalance = linkedCats.reduce((sum, c) => sum + parseFloat(c.currentBalance || "0"), 0) + buffer;
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
      const [account] = await ctx.db.select().from(bankAccounts).where(eq(bankAccounts.id, accountId));
      const buffer = parseFloat(account?.unbudgetedBuffer || "0");
      const expected = linkedCats.reduce((sum, c) => sum + parseFloat(c.currentBalance || "0"), 0) + buffer;

      const diff = actual - expected;

      if (Math.abs(diff) < 0.01) {
        await ctx.db
          .update(bankAccounts)
          .set({ lastKnownBalance: input.actualBalance, updatedAt: new Date(), updatedBy: ctx.userId! })
          .where(eq(bankAccounts.id, accountId));
        return { success: true, diff: 0 };
      }

      if (diff > 0) {
        let surplusCatId = input.targetCategoryId;
        if (!surplusCatId) {
          const fallback = linkedCats.find((c) => c.type === "GOAL") || linkedCats.find((c) => c.type === "EVERYDAY") || allCategories[0];
          surplusCatId = fallback?.id;
        }

        if (!surplusCatId) throw new Error("Please select a target category to allocate the surplus.");

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
      } else {
        const drawdowns = input.drawdowns || [];
        if (drawdowns.length === 0) {
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

          if (remainingDeficit > 0.005) {
            const everydayCat = linkedCats.find((c) => c.type === "EVERYDAY") || allCategories.find((c) => c.type === "EVERYDAY");
            if (everydayCat) {
              await recordExpenseCommand(
                {
                  categoryId: everydayCat.id,
                  amount: remainingDeficit.toFixed(2),
                  flowType: "DEBIT",
                  source: "MANUAL",
                  note: `Bank Reconciliation Deficit unallocated adjustment`,
                  recordedAt: new Date().toISOString(),
                },
                ctx.tenantId!,
                ctx.appId!,
                ctx.userId!,
                ctx.db
              );
            }
          }
        } else {
          for (const item of drawdowns) {
            const takeAmt = parseFloat(item.amount);
            if (takeAmt > 0) {
              await recordExpenseCommand(
                {
                  categoryId: item.categoryId,
                  amount: takeAmt.toFixed(2),
                  flowType: "DEBIT",
                  source: "MANUAL",
                  note: `Bank Reconciliation Specified Deficit adjustment`,
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
      }

      await ctx.db
        .update(bankAccounts)
        .set({ lastKnownBalance: input.actualBalance, updatedAt: new Date(), updatedBy: ctx.userId! })
        .where(eq(bankAccounts.id, accountId));

      return { success: true, diff };
    }),
};
