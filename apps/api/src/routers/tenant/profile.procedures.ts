import { tenantProcedure, privateTenantProcedure, authenticatedProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { MONEY_MATTERS_APP_ID } from '../../trpc/edge-context.js';
import { userPreferences, tenantUserPreferences, users, tenants, AppPreferencesBlob } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { COUNTRY_DEFAULTS } from "@money-matters/types";
import { z } from 'zod';

export const profileProcedures = {
  getUserPreferences: privateTenantProcedure
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

      const [currentTenant] = ctx.tenantId
        ? await ctx.db.select().from(tenants).where(eq(tenants.id, ctx.tenantId)).limit(1)
        : [null];

      const setupStatus = (currentTenant?.setupStatus as "PENDING" | "CANCELLED" | "COMPLETED") || "PENDING";
      const setupCompleted =
        setupStatus === "COMPLETED" ||
        setupStatus === "CANCELLED" ||
        Boolean(currentTenant?.setupCompletedAt);
      const setupCompletedAt = currentTenant?.setupCompletedAt?.toISOString() || null;

      const tenantCountry = currentTenant?.country;
      const countryDefaults = tenantCountry ? (COUNTRY_DEFAULTS as Record<string, { locale?: string; phoneCountryCode?: string; timezone?: string }>)[tenantCountry] : null;

      return {
        id: globalPref?.id || tenantPref?.id,
        userId: ctx.userId!,
        tenantId: ctx.tenantId!,
        appId,
        timezone: globalPref?.timezone || currentTenant?.timezone || "Australia/Sydney",
        tenantTimezone: currentTenant?.timezone || "Australia/Sydney",
        currency: currentTenant?.currency || "AUD",
        country: currentTenant?.country || "AU",
        language: (globalPref?.language as "en") || "en",
        locale: tenantCountry
          ? (countryDefaults?.locale || `en-${tenantCountry}`)
          : "en-AU",
        theme: globalPref?.theme ?? "system",
        showIcons: globalPref?.showIcons ?? true,
        notificationEmail: globalPref?.notificationEmail ?? null,
        phoneCountryCode: globalPref?.phoneCountryCode && globalPref.phoneCountryCode !== "+61"
          ? globalPref.phoneCountryCode
          : (countryDefaults?.phoneCountryCode || globalPref?.phoneCountryCode || "+61"),
        phoneNumber: globalPref?.phoneNumber ?? null,
        setupCompleted,
        setupStatus,
        setupCompletedAt,
        appPreferences: tenantPref?.appPreferences ?? {},
      };
    }),

  updateUserPreferences: privateTenantProcedure
    .input(
      z.object({
        timezone: z.string().optional(),
        language: z.enum(["en"]).optional(),
        theme: z.string().optional(),
        showIcons: z.boolean().optional(),
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
            language: input.language ?? existingGlobal.language,
            timezone: input.timezone !== undefined ? input.timezone : existingGlobal.timezone,
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
            language: input.language ?? "en",
            timezone: input.timezone || null,
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

      if (input.setupCompleted !== undefined && ctx.tenantId) {
        await ctx.db
          .update(tenants)
          .set({
            setupStatus: input.setupCompleted ? "COMPLETED" : "PENDING",
            setupCompletedAt: input.setupCompleted ? new Date() : null,
            updatedAt: new Date(),
            updatedBy: ctx.userId,
          })
          .where(eq(tenants.id, ctx.tenantId));
      }

      return { success: true };
    }),

  getUserProfile: authenticatedProcedure.query(async ({ ctx }) => {
    const [u] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId!));
    const [pref] = await ctx.db.select().from(userPreferences).where(eq(userPreferences.userId, ctx.userId!));
    const [tenantObj] = ctx.tenantId ? await ctx.db.select().from(tenants).where(eq(tenants.id, ctx.tenantId)).limit(1) : [null];
    const tenantCountryDefaults = tenantObj?.country ? (COUNTRY_DEFAULTS as Record<string, { locale?: string; phoneCountryCode?: string; timezone?: string }>)[tenantObj.country] : null;

    return {
      id: ctx.userId!,
      email: u?.email || "",
      displayName: u?.displayName || "",
      avatarUrl: u?.avatarUrl || null,
      notificationEmail: pref?.notificationEmail || u?.email || "",
      phoneCountryCode: pref?.phoneCountryCode && pref.phoneCountryCode !== "+61"
        ? pref.phoneCountryCode
        : (tenantCountryDefaults?.phoneCountryCode || pref?.phoneCountryCode || "+61"),
      phoneNumber: pref?.phoneNumber || "",
      timezone: pref?.timezone || tenantObj?.timezone || tenantCountryDefaults?.timezone || "Australia/Sydney",
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
        avatarUrl: z
          .string()
          .max(300_000, "Avatar payload exceeds maximum allowed size of 200KB")
          .optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
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
};
