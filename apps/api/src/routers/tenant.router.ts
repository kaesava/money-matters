import { tenantProcedure, authenticatedProcedure, ownerProcedure, publicProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { MONEY_MATTERS_APP_ID } from '../trpc/context.js';
import { db, userPreferences, bankAccounts, bankAccountCategoryMappings, categories, AppPreferencesBlob } from "@money-matters/db";
import { and, eq, sql, or } from "drizzle-orm";
import { inngest } from '../inngest/client.js';
import { 
  createTenantHandler,
  createBankAccountHandler,
  updateBankAccountHandler,
  archiveBankAccountHandler,
  getTenantHandler,
  getBankAccountsWithMappingsHandler,
  updateBankAccountMappingsHandler,
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
      requiresWriteAccess(ctx);
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
      const appId = ctx.appId || ctx.session?.appId || MONEY_MATTERS_APP_ID;
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
            household_name: input.name,
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

      const appId = ctx.appId || MONEY_MATTERS_APP_ID;
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
        appPreferences: z.record(z.string(), z.record(z.string(), z.any())).optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [existing] = await ctx.db
        .select()
        .from(userPreferences)
        .where(
          and(
            eq(userPreferences.userId, ctx.userId!),
            eq(userPreferences.tenantId, ctx.tenantId!)
          )
        );

      const appId = ctx.appId || MONEY_MATTERS_APP_ID;
      const existingAppPrefs: Record<string, AppPreferencesBlob> = existing?.appPreferences || {};
      const currentAppBlob = existingAppPrefs[appId] || {};

      const updatedAppBlob: AppPreferencesBlob = {
        ...currentAppBlob,
        ...(input.quickActionsCollapsed !== undefined ? { quick_actions_collapsed: input.quickActionsCollapsed } : {}),
        ...(input.appPreferences?.[appId] ? input.appPreferences[appId] : {}),
      };

      const updatedAppPrefs: Record<string, AppPreferencesBlob> = {
        ...existingAppPrefs,
        ...input.appPreferences,
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
      requiresWriteAccess(ctx);
      const handler = createBankAccountHandler(ctx.db);
      const result = await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'bank_account_created',
          properties: {
            tenant_id: ctx.tenantId,
            account_name: input.name,
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
      requiresWriteAccess(ctx);
      const handler = updateBankAccountHandler(ctx.db);
      return await handler(input.accountId, input.data, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  archiveBankAccount: ownerProcedure
    .input(z.object({ accountId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const handler = archiveBankAccountHandler(ctx.db);
      return await handler(input.accountId, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  getBankAccountsWithMappings: tenantProcedure
    .query(async ({ ctx }) => {
      const handler = getBankAccountsWithMappingsHandler(ctx.db);
      return await handler(ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  updateBankAccountMappings: ownerProcedure
    .input(z.object({
      mappings: z.array(z.object({
        categoryType: z.enum(["EVERYDAY", "REGULAR", "GOAL"]),
        bankAccountId: z.string().uuid(),
      }))
    }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const handler = updateBankAccountMappingsHandler(ctx.db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
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
            sql`${bankAccounts.archivedAt} IS NULL`,
            or(eq(bankAccounts.isPrivate, false), eq(bankAccounts.userId, ctx.userId!))!
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
            sql`${bankAccounts.archivedAt} IS NULL`,
            or(eq(bankAccounts.isPrivate, false), eq(bankAccounts.userId, ctx.userId!))!
          )
        );

      const allCategories = await listCategoriesQuery(ctx.tenantId!, ctx.appId!, ctx.db, ctx.userId!);

      const mappings = await ctx.db
        .select()
        .from(bankAccountCategoryMappings)
        .where(
          and(
            eq(bankAccountCategoryMappings.tenantId, ctx.tenantId!),
            eq(bankAccountCategoryMappings.appId, ctx.appId!),
            sql`${bankAccountCategoryMappings.archivedAt} IS NULL`
          )
        );

      return accounts.map((acc) => {
        const mappedTypes = mappings.filter((m) => m.bankAccountId === acc.id).map((m) => m.categoryType);
        const linkedCats = allCategories.filter((c) => mappedTypes.includes(c.type));
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
        splits: z.array(
          z.object({
            categoryId: z.string().uuid(),
            adjustment: z.string(), // positive for CREDIT, negative for DEBIT
          })
        ),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const accountId = input.accountId;

      // Update bank account balance
      await ctx.db
        .update(bankAccounts)
        .set({ lastKnownBalance: input.actualBalance, updatedAt: new Date(), updatedBy: ctx.userId! })
        .where(eq(bankAccounts.id, accountId));

      // Record transaction for each split adjustment
      for (const split of input.splits) {
        const adj = parseFloat(split.adjustment);
        if (Math.abs(adj) < 0.01) continue;

        const cat = await ctx.db.query.categories.findFirst({
          where: eq(categories.id, split.categoryId),
        });
        const categoryName = cat ? cat.name : "Category";

        await recordExpenseCommand(
          {
            categoryId: split.categoryId,
            amount: Math.abs(adj).toFixed(2),
            flowType: adj > 0 ? "CREDIT" : "DEBIT",
            source: "MANUAL",
            note: `${categoryName} Pool Adjustment`,
            recordedAt: new Date().toISOString(),
          },
          ctx.tenantId!,
          ctx.appId!,
          ctx.userId!,
          ctx.db
        );
      }

      return { success: true };
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

  listUserTenants: authenticatedProcedure
    .query(async ({ ctx }) => {
      const { tenants, tenantUsers } = await import('@money-matters/db');
      const records = await ctx.db
        .select({
          id: tenants.id,
          name: tenants.name,
          role: tenantUsers.role,
        })
        .from(tenantUsers)
        .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
        .where(eq(tenantUsers.userId, ctx.userId!));

      return records.map((r) => ({
        ...r,
        isCurrent: r.id === ctx.tenantId,
      }));
    }),

  switchTenant: authenticatedProcedure
    .input(z.object({ tenantId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      const { tenantUsers } = await import('@money-matters/db');
      const [membership] = await ctx.db
        .select()
        .from(tenantUsers)
        .where(
          and(
            eq(tenantUsers.tenantId, input.tenantId),
            eq(tenantUsers.userId, ctx.userId!),
            eq(tenantUsers.inviteStatus, "ACCEPTED")
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error("You do not have access to switch to this household.");
      }

      return { success: true, activeTenantId: input.tenantId };
    }),

  subscribeEarlyAccess: publicProcedure
    .input(z.object({ email: z.string().email() }).strict())
    .mutation(async ({ input, ctx }) => {
      const { earlyAccessSubscribers } = await import('@money-matters/db');
      await ctx.db.insert(earlyAccessSubscribers).values({
        email: input.email,
        tenantId: ctx.tenantId ?? ctx.appId ?? "01908bde-34bb-7b19-a178-574211bc93aa",
        appId: ctx.appId ?? "01908bde-34bb-7b19-a178-574211bc93aa",
        createdBy: ctx.userId ?? "public",
        updatedBy: ctx.userId ?? "public",
      });
      return { success: true };
    }),
};


