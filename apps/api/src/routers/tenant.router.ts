import { tenantProcedure, authenticatedProcedure, ownerProcedure, publicProcedure, privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { MONEY_MATTERS_APP_ID } from '../trpc/context.js';
import { db, userPreferences, tenantUserPreferences, bankAccounts, pools, categories, transactionLedger, AppPreferencesBlob } from "@money-matters/db";
import { and, eq, sql, or, inArray } from "drizzle-orm";

import { inngest } from '../inngest/client.js';
import { logAuditEvent, sendNotificationEmail } from '@money-matters/core';
import { 
  createTenantHandler,
  createBankAccountHandler,
  updateBankAccountHandler,
  archiveBankAccountHandler,
  getTenantHandler,
  getBankAccountsWithMappingsHandler,
  invitePartnerHandler,
  acceptInviteHandler,
  exportMyDataHandler,
  deleteMyAccountHandler,
  leaveTenantHandler,
} from "@money-matters/capability-tenant";
import {
  listPoolsQuery,
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
      const result = await handler(input, ctx.tenantId!, ctx.userId!);

      const isDev = process.env.NODE_ENV === "development";
      const originUrl =
        process.env.APP_URL ||
        (isDev ? "http://localhost:3000" : "https://moneymatters.kaesava.au");
      const inviteUrl = `${originUrl}/invite/${result.inviteToken}`;
      await sendNotificationEmail(
        input.email,
        "Invitation to Join Household Budget — Money Matters",
        `You have been invited to collaborate on a household budget on Money Matters.\n\nClick the link below to accept your invitation:\n${inviteUrl}\n\nThis invitation will expire in 48 hours.`
      );

      inngest.send({
        name: 'partner/invited',
        data: {
          email: input.email,
          inviteToken: result.inviteToken,
          tenantId: ctx.tenantId!,
          senderUserId: ctx.userId!,
        },
      }).catch(() => {});

      logAuditEvent('partner_invited', ctx.tenantId!, ctx.userId!, { inviteEmail: input.email });

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

      return {
        success: true,
        email: input.email,
        inviteEmail: input.email,
        inviteToken: result.inviteToken,
        expiresAt: result.expiresAt,
      };
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
      const appId = ctx.appId || MONEY_MATTERS_APP_ID;

      const [globalPref] = await ctx.db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.userId!));

      const [tenantPref] = await ctx.db
        .select()
        .from(tenantUserPreferences)
        .where(
          and(
            eq(tenantUserPreferences.userId, ctx.userId!),
            eq(tenantUserPreferences.tenantId, ctx.tenantId!),
            eq(tenantUserPreferences.appId, appId)
          )
        );

      const appBlob = tenantPref?.appPreferences?.[appId];
      const { tenants } = await import("@money-matters/db");
      const [currentTenant] = ctx.tenantId
        ? await ctx.db.select().from(tenants).where(eq(tenants.id, ctx.tenantId)).limit(1)
        : [null];

      return {
        id: globalPref?.id || tenantPref?.id,
        userId: ctx.userId!,
        tenantId: ctx.tenantId!,
        appId,
        timezone: currentTenant?.timezone ?? "Australia/Sydney",
        locale: currentTenant?.country ? `en-${currentTenant.country}` : "en-AU",
        theme: globalPref?.theme ?? "system",
        showIcons: globalPref?.showIcons ?? appBlob?.show_icons ?? true,
        notificationEmail: globalPref?.notificationEmail ?? null,
        phoneCountryCode: globalPref?.phoneCountryCode ?? "+61",
        phoneNumber: globalPref?.phoneNumber ?? null,
        paydayAlertsEnabled: appBlob?.payday_alerts_enabled ?? true,
        shortfallAlertsEnabled: appBlob?.shortfall_alerts_enabled ?? true,
        billRemindersEnabled: appBlob?.bill_reminders_enabled ?? true,
        weeklyDigestEnabled: appBlob?.weekly_digest_enabled ?? false,
        setupCompleted: appBlob?.setup_completed ?? false,
        setupCompletedAt: appBlob?.setup_completed_at ?? null,
        appPreferences: tenantPref?.appPreferences ?? {},
        quickActionsCollapsed: appBlob?.quick_actions_collapsed ?? false,
      };
    }),

  updateUserPreferences: tenantProcedure
    .input(
      z.object({
        quickActionsCollapsed: z.boolean().optional(),
        timezone: z.string().optional(),
        locale: z.string().optional(),
        theme: z.string().optional(),
        showIcons: z.boolean().optional(),
        paydayAlertsEnabled: z.boolean().optional(),
        shortfallAlertsEnabled: z.boolean().optional(),
        billRemindersEnabled: z.boolean().optional(),
        weeklyDigestEnabled: z.boolean().optional(),
        setupCompleted: z.boolean().optional(),
        appPreferences: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const appId = ctx.appId || MONEY_MATTERS_APP_ID;

      const [existingGlobal] = await ctx.db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.userId!));

      if (existingGlobal) {
        await ctx.db
          .update(userPreferences)
          .set({
            theme: input.theme ?? existingGlobal.theme,
            showIcons: input.showIcons ?? existingGlobal.showIcons,
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.id, existingGlobal.id));
      } else {
        await ctx.db
          .insert(userPreferences)
          .values({
            userId: ctx.userId!,
            theme: input.theme ?? "system",
            showIcons: input.showIcons ?? true,
          });
      }

      const [existingTenantPref] = await ctx.db
        .select()
        .from(tenantUserPreferences)
        .where(
          and(
            eq(tenantUserPreferences.userId, ctx.userId!),
            eq(tenantUserPreferences.tenantId, ctx.tenantId!),
            eq(tenantUserPreferences.appId, appId)
          )
        );

      const existingAppPrefs: Record<string, AppPreferencesBlob> = existingTenantPref?.appPreferences || {};
      const currentAppBlob = existingAppPrefs[appId] || {};

      const updatedAppBlob: AppPreferencesBlob = {
        ...currentAppBlob,
        ...(input.paydayAlertsEnabled !== undefined ? { payday_alerts_enabled: input.paydayAlertsEnabled } : {}),
        ...(input.shortfallAlertsEnabled !== undefined ? { shortfall_alerts_enabled: input.shortfallAlertsEnabled } : {}),
        ...(input.billRemindersEnabled !== undefined ? { bill_reminders_enabled: input.billRemindersEnabled } : {}),
        ...(input.weeklyDigestEnabled !== undefined ? { weekly_digest_enabled: input.weeklyDigestEnabled } : {}),
        ...(input.quickActionsCollapsed !== undefined ? { quick_actions_collapsed: input.quickActionsCollapsed } : {}),
        ...(input.showIcons !== undefined ? { show_icons: input.showIcons } : {}),
        ...(input.setupCompleted !== undefined
          ? {
              setup_completed: input.setupCompleted,
              setup_completed_at: input.setupCompleted
                ? currentAppBlob.setup_completed_at || new Date().toISOString()
                : undefined,
            }
          : {}),
        ...(input.appPreferences?.[appId] ? input.appPreferences[appId] : {}),
      };

      const updatedAppPrefs: Record<string, AppPreferencesBlob> = {
        ...existingAppPrefs,
        ...input.appPreferences,
        [appId]: updatedAppBlob,
      };

      if (existingTenantPref) {
        await ctx.db
          .update(tenantUserPreferences)
          .set({
            appPreferences: updatedAppPrefs,
            updatedAt: new Date(),
          })
          .where(eq(tenantUserPreferences.id, existingTenantPref.id));
      } else {
        await ctx.db
          .insert(tenantUserPreferences)
          .values({
            userId: ctx.userId!,
            tenantId: ctx.tenantId!,
            appId,
            appPreferences: updatedAppPrefs,
          });
      }

      return { success: true };
    }),

  createBankAccount: privateTenantProcedure
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

  updateBankAccount: privateTenantProcedure
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

  getBankAccountsWithMappings: privateTenantProcedure
    .query(async ({ ctx }) => {
      const handler = getBankAccountsWithMappingsHandler(ctx.db);
      return await handler(ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  listBankAccounts: privateTenantProcedure
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

  listBankAccountsWithExpected: privateTenantProcedure
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

      const allPools = await listPoolsQuery(ctx.tenantId!, ctx.appId!, ctx.db, ctx.userId!);

      return accounts.map((acc) => {
        const linkedPools = allPools.filter((p) => p.bankAccountId === acc.id);
        const buffer = parseFloat(acc.unbudgetedBuffer || "0");
        const expectedBalance = linkedPools.reduce((sum, p) => sum + (p.currentBalance || 0), 0) + buffer;
        return {
          ...acc,
          expectedBalance: expectedBalance.toFixed(2),
          linkedPoolCount: linkedPools.length,
        };
      });
    }),


  reconcileBankBalance: privateTenantProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        actualBalance: z.string().regex(/^\d+(\.\d{1,2})?$/),
        clientIdempotencyToken: z.string().uuid(),
        splits: z.array(
          z.object({
            poolId: z.string().uuid(),
            categoryId: z.string().uuid().optional(),
            adjustment: z.string(),
          })
        ),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const accountId = input.accountId;

      return await ctx.db.transaction(async (tx) => {
        await tx
          .update(bankAccounts)
          .set({ lastKnownBalance: input.actualBalance, updatedAt: new Date(), updatedBy: ctx.userId! })
          .where(eq(bankAccounts.id, accountId));

        const targetPoolIds = input.splits.map((s) => s.poolId);
        const dbPools = targetPoolIds.length > 0
          ? await tx
              .select({ id: pools.id, name: pools.name })
              .from(pools)
              .where(
                and(
                  inArray(pools.id, targetPoolIds),
                  eq(pools.tenantId, ctx.tenantId!),
                  eq(pools.appId, ctx.appId!)
                )
              )
          : [];

        const poolNameMap = new Map(dbPools.map((p) => [p.id, p.name]));

        const txValues = [];
        for (const split of input.splits) {
          const adj = parseFloat(split.adjustment);
          if (Math.abs(adj) < 0.01) continue;

          const poolName = poolNameMap.get(split.poolId) || "Pool";
          txValues.push({
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            poolId: split.poolId,
            categoryId: split.categoryId || null,
            bankAccountId: accountId,
            flowType: (adj > 0 ? "CREDIT" : "DEBIT") as "CREDIT" | "DEBIT",
            amount: Math.abs(adj).toFixed(2),
            idempotencyKey: `reconcile-${accountId}-${split.poolId}-${input.clientIdempotencyToken}`,
            note: `${poolName} Reconciliation Adjustment`,
            source: "MANUAL" as const,
            createdBy: ctx.userId!,
            updatedBy: ctx.userId!,
          });
        }

        if (txValues.length > 0) {
          await tx.insert(transactionLedger).values(txValues);
        }

        return { success: true };
      });
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

  leaveMyHousehold: authenticatedProcedure
    .mutation(async ({ ctx }) => {
      const handler = leaveTenantHandler(ctx.db);
      return await handler(ctx.tenantId!, ctx.userId!, ctx.email!, ctx.appId!);
    }),

  getHouseholdGovernanceInfo: tenantProcedure
    .query(async ({ ctx }) => {
      const { tenants, tenantUsers, users } = await import('@money-matters/db');
      const [tenant] = await ctx.db
        .select()
        .from(tenants)
        .where(eq(tenants.id, ctx.tenantId!))
        .limit(1);

      const dbMembers = await ctx.db
        .select({
          id: tenantUsers.id,
          userId: tenantUsers.userId,
          role: tenantUsers.role,
          inviteEmail: tenantUsers.inviteEmail,
          inviteStatus: tenantUsers.inviteStatus,
          displayName: users.displayName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        })
        .from(tenantUsers)
        .leftJoin(users, eq(tenantUsers.userId, users.id))
        .where(and(eq(tenantUsers.tenantId, ctx.tenantId!), sql`${tenantUsers.archivedAt} IS NULL`));

      const myMember = dbMembers.find((m) => m.userId === ctx.userId);
      const partnerMember = dbMembers.find((m) => m.userId !== ctx.userId);

      const membersList = dbMembers.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.displayName || m.email || m.inviteEmail || "Household Member",
        email: m.email || m.inviteEmail || "",
        avatarUrl: m.avatarUrl || null,
        role: m.role || "MEMBER",
        isOwner: m.role === "OWNER",
        inviteStatus: m.inviteStatus || "ACCEPTED",
        isPending: m.inviteStatus === "PENDING",
      }));

      return {
        householdId: ctx.tenantId!,
        householdName: tenant?.name ?? "Household",
        userRole: myMember?.role ?? "MEMBER",
        isOwner: myMember?.role === "OWNER",
        isSoleOwner: myMember?.role === "OWNER" && dbMembers.length <= 1,
        memberCount: dbMembers.length,
        partnerEmail: partnerMember?.inviteEmail ?? partnerMember?.email ?? null,
        country: tenant?.country ?? "AU",
        state: tenant?.state ?? null,
        postcode: tenant?.postcode ?? null,
        membersList,
      };
    }),

  removeHouseholdMember: tenantProcedure
    .input(
      z.object({
        targetUserId: z.string().optional(),
        memberId: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantUsers, bankAccounts, pools, categories, tenantUserPreferences } = await import('@money-matters/db');

      const [caller] = await ctx.db
        .select()
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, ctx.tenantId!), eq(tenantUsers.userId, ctx.userId!), sql`${tenantUsers.archivedAt} IS NULL`));

      if (caller?.role !== "OWNER") {
        throw new Error("Only the household owner can remove members.");
      }

      if (input.targetUserId && input.targetUserId === ctx.userId) {
        throw new Error("You cannot remove yourself using member removal.");
      }

      const memberFilter = input.memberId
        ? eq(tenantUsers.id, input.memberId)
        : input.targetUserId
        ? eq(tenantUsers.userId, input.targetUserId)
        : null;

      if (!memberFilter) {
        throw new Error("Target member ID or User ID is required.");
      }

      const [targetMember] = await ctx.db
        .select()
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, ctx.tenantId!), memberFilter));

      if (targetMember?.userId) {
        const targetUserId = targetMember.userId;
        const privateBankAccs = await ctx.db
          .select({ id: bankAccounts.id })
          .from(bankAccounts)
          .where(and(eq(bankAccounts.tenantId, ctx.tenantId!), eq(bankAccounts.userId, targetUserId), eq(bankAccounts.isPrivate, true)));

        const privateBankAccIds = privateBankAccs.map((b) => b.id);

        if (privateBankAccIds.length > 0) {
          const privatePoolsList = await ctx.db
            .select({ id: pools.id })
            .from(pools)
            .where(inArray(pools.bankAccountId, privateBankAccIds));

          const privatePoolIds = privatePoolsList.map((p) => p.id);

          if (privatePoolIds.length > 0) {
            await ctx.db.delete(categories).where(inArray(categories.poolId, privatePoolIds));
            await ctx.db.delete(pools).where(inArray(pools.id, privatePoolIds));
          }
          await ctx.db.delete(bankAccounts).where(inArray(bankAccounts.id, privateBankAccIds));
        }

        await ctx.db.delete(tenantUserPreferences).where(and(eq(tenantUserPreferences.tenantId, ctx.tenantId!), eq(tenantUserPreferences.userId, targetUserId)));
      }

      await ctx.db
        .update(tenantUsers)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(tenantUsers.tenantId, ctx.tenantId!), memberFilter));

      return { success: true };
    }),


  updateHousehold: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1, "Household name is required"),
        country: z.string().optional(),
        state: z.string().optional(),
        postcode: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { tenants, tenantUsers } = await import('@money-matters/db');

      const members = await ctx.db
        .select()
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, ctx.tenantId!), eq(tenantUsers.userId, ctx.userId!), sql`${tenantUsers.archivedAt} IS NULL`));

      const myMember = members[0];
      if (myMember?.role !== "OWNER") {
        throw new Error("Only the owner can update household settings");
      }

      await ctx.db
        .update(tenants)
        .set({
          name: input.name,
          country: input.country ?? "AU",
          state: input.state || null,
          postcode: input.postcode || null,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, ctx.tenantId!));

      return { success: true };
    }),

  getUserProfile: authenticatedProcedure.query(async ({ ctx }) => {
    const { users, userPreferences, tenants } = await import('@money-matters/db');
    const [u] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId!));
    const [pref] = await ctx.db.select().from(userPreferences).where(eq(userPreferences.userId, ctx.userId!));
    const [tenantObj] = ctx.tenantId ? await ctx.db.select().from(tenants).where(eq(tenants.id, ctx.tenantId)).limit(1) : [null];

    return {
      id: ctx.userId!,
      email: u?.email || "",
      displayName: u?.displayName || "",
      avatarUrl: u?.avatarUrl || null,
      notificationEmail: pref?.notificationEmail || u?.email || "",
      phoneCountryCode: pref?.phoneCountryCode || "+61",
      phoneNumber: pref?.phoneNumber || "",
      timezone: tenantObj?.timezone || "Australia/Sydney",
      showIcons: pref?.showIcons ?? true,
    };
  }),

  updateUserProfile: authenticatedProcedure
    .input(
      z.object({
        displayName: z.string().min(1, "Name is required"),
        notificationEmail: z.string().email("Invalid email address"),
        phoneCountryCode: z.string().optional(),
        phoneNumber: z.string().optional(),
        avatarUrl: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      const { users, userPreferences } = await import('@money-matters/db');

      await ctx.db
        .update(users)
        .set({
          displayName: input.displayName,
          avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : undefined,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.userId!));

      try {
        await ctx.db.execute(
          sql`UPDATE neon_auth.user SET name = ${input.displayName}, image = ${input.avatarUrl || null} WHERE id = ${ctx.userId}`
        );
      } catch {
        // Non-blocking: neon_auth.user table may not exist in mock DB or test environments
      }

      const [existingPref] = await ctx.db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.userId!));

      if (existingPref) {
        await ctx.db
          .update(userPreferences)
          .set({
            notificationEmail: input.notificationEmail,
            phoneCountryCode: input.phoneCountryCode ?? existingPref.phoneCountryCode,
            phoneNumber: input.phoneNumber !== undefined ? (input.phoneNumber || null) : existingPref.phoneNumber,
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.id, existingPref.id));
      } else {
        await ctx.db
          .insert(userPreferences)
          .values({
            userId: ctx.userId!,
            notificationEmail: input.notificationEmail,
            phoneCountryCode: input.phoneCountryCode || "+61",
            phoneNumber: input.phoneNumber || null,
          });
      }

      return { success: true };
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
      const appId = ctx.appId ?? MONEY_MATTERS_APP_ID;
      const normalizedEmail = input.email.trim().toLowerCase();
      const now = new Date();

      await ctx.db
        .insert(earlyAccessSubscribers)
        .values({
          appId,
          email: normalizedEmail,
          lastSubscribedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [earlyAccessSubscribers.appId, earlyAccessSubscribers.email],
          set: {
            lastSubscribedAt: now,
            updatedAt: now,
          },
        });

      return { success: true };
    }),
};
