import { tenantProcedure, authenticatedProcedure, ownerProcedure } from '../trpc/trpc.js';
import { db, userPreferences, bankAccounts, AppPreferencesBlob } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { inngest } from '../inngest/client.js';
import { 
  createTenantHandler,
  createBankAccountHandler,
  updateBankAccountHandler,
  archiveBankAccountHandler,
  getTenantHandler,
  invitePartnerHandler,
  acceptInviteHandler,
  exportMyDataHandler,
  deleteMyAccountHandler,
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
import { posthog } from '../lib/posthog.js';

export const tenantRouter = {
  invitePartner: ownerProcedure
    .input(z.object({ email: z.string().email() }).strict())
    .mutation(async ({ input, ctx }) => {
      const handler = invitePartnerHandler(ctx.db);
      const result = await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);

      // Dispatch non-blocking partner invite email trigger to Inngest
      inngest.send({
        name: 'partner/invited',
        data: {
          email: input.email,
          inviteToken: result.inviteToken,
          tenantId: ctx.tenantId!,
          senderUserId: ctx.userId!,
        },
      }).catch(() => {});

      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'partner_invited',
          properties: {
            tenant_id: ctx.tenantId,
          },
        });
        await posthog.flush();
      }
      return result;
    }),

  acceptInvite: authenticatedProcedure
    .input(z.object({ inviteToken: z.string().min(1) }).strict())
    .mutation(async ({ input, ctx }) => {
      const handler = acceptInviteHandler(ctx.db);
      const result = await handler(input, ctx.userId!, ctx.email ?? undefined);
      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'partner_invite_accepted',
          properties: {},
        });
        await posthog.flush();
      }
      return result;
    }),

  createTenant: authenticatedProcedure
    .input(CreateTenantCommand)
    .mutation(async ({ input, ctx }) => {
      const appId = ctx.appId || ctx.session?.appId || "01908bde-34bb-7b19-a178-574211bc93aa";
      const handler = createTenantHandler(ctx.db || db);
      const result = await handler(input, appId, ctx.userId);
      if (posthog && ctx.userId) {
        posthog.identify({
          distinctId: ctx.userId,
          properties: {
            app_id: appId,
            has_tenant: true,
          },
        });
        posthog.capture({
          distinctId: ctx.userId,
          event: 'tenant_created',
          properties: {
            app_id: appId,
            household_name: (result as any)?.name ?? undefined,
          },
        });
        await posthog.flush();
      }
      return result;
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

      const appId = ctx.appId || "01908bde-34bb-7b19-a178-574211bc93aa";
      const appBlob = pref?.appPreferences?.[appId];

      return {
        ...pref,
        quickActionsCollapsed: appBlob?.quick_actions_collapsed ?? false,
        timezone: pref?.timezone ?? "Australia/Sydney",
        paydayAlertsEnabled: pref?.paydayAlertsEnabled ?? true,
        shortfallAlertsEnabled: pref?.shortfallAlertsEnabled ?? true,
        billRemindersEnabled: pref?.billRemindersEnabled ?? true,
        weeklyDigestEnabled: pref?.weeklyDigestEnabled ?? false,
      };
    }),

  updateUserPreferences: tenantProcedure
    .input(
      z.object({
        quickActionsCollapsed: z.boolean().optional(),
        timezone: z.string().optional(),
        paydayAlertsEnabled: z.boolean().optional(),
        shortfallAlertsEnabled: z.boolean().optional(),
        billRemindersEnabled: z.boolean().optional(),
        weeklyDigestEnabled: z.boolean().optional(),
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

      const appId = ctx.appId || "01908bde-34bb-7b19-a178-574211bc93aa";
      const existingAppPrefs: Record<string, AppPreferencesBlob> = existing?.appPreferences || {};
      const currentAppBlob = existingAppPrefs[appId] || {};

      const updatedAppBlob: AppPreferencesBlob = {
        ...currentAppBlob,
        ...(input.quickActionsCollapsed !== undefined ? { quick_actions_collapsed: input.quickActionsCollapsed } : {}),
      };

      const updatedAppPrefs: Record<string, AppPreferencesBlob> = {
        ...existingAppPrefs,
        [appId]: updatedAppBlob,
      };

      if (existing) {
        const [updated] = await ctx.db
          .update(userPreferences)
          .set({
            appPreferences: updatedAppPrefs,
            timezone: input.timezone ?? existing.timezone,
            paydayAlertsEnabled: input.paydayAlertsEnabled ?? existing.paydayAlertsEnabled,
            shortfallAlertsEnabled: input.shortfallAlertsEnabled ?? existing.shortfallAlertsEnabled,
            billRemindersEnabled: input.billRemindersEnabled ?? existing.billRemindersEnabled,
            weeklyDigestEnabled: input.weeklyDigestEnabled ?? existing.weeklyDigestEnabled,
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.id, existing.id))
          .returning();

        const resAppBlob = updated.appPreferences?.[appId];

        return {
          ...updated,
          quickActionsCollapsed: resAppBlob?.quick_actions_collapsed ?? false,
        };
      } else {
        const [inserted] = await ctx.db
          .insert(userPreferences)
          .values({
            userId: ctx.userId!,
            tenantId: ctx.tenantId!,
            appPreferences: updatedAppPrefs,
            timezone: input.timezone ?? "Australia/Sydney",
            paydayAlertsEnabled: input.paydayAlertsEnabled ?? true,
            shortfallAlertsEnabled: input.shortfallAlertsEnabled ?? true,
            billRemindersEnabled: input.billRemindersEnabled ?? true,
            weeklyDigestEnabled: input.weeklyDigestEnabled ?? false,
          })
          .returning();

        const resAppBlob = inserted.appPreferences?.[appId];

        return {
          ...inserted,
          quickActionsCollapsed: resAppBlob?.quick_actions_collapsed ?? false,
        };
      }
    }),

  createBankAccount: tenantProcedure
    .input(CreateBankAccountCommand)
    .mutation(async ({ input, ctx }) => {
      const handler = createBankAccountHandler(ctx.db);
      const result = await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'bank_account_created',
          properties: {
            tenant_id: ctx.tenantId,
            account_type: (input as any)?.type ?? undefined,
          },
        });
        await posthog.flush();
      }
      return result;
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

  archiveBankAccount: ownerProcedure
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

  exportMyData: tenantProcedure
    .query(async ({ ctx }) => {
      const handler = exportMyDataHandler(ctx.db);
      return await handler(ctx.tenantId!, ctx.userId!, ctx.appId!);
    }),

  deleteMyAccount: authenticatedProcedure
    .mutation(async ({ ctx }) => {
      const handler = deleteMyAccountHandler(ctx.db);
      const result = await handler(ctx.tenantId!, ctx.userId!, ctx.email!, ctx.appId!);

      // Dispatch non-blocking background account deletion worker to Inngest
      inngest.send({
        name: 'user/account.delete-requested',
        data: {
          userId: ctx.userId!,
          tenantId: ctx.tenantId ?? undefined,
          email: ctx.email ?? undefined,
        },
      }).catch(() => {});

      return result;
    }),
};

