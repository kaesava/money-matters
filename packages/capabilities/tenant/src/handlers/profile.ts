import { userPreferences, tenantUserPreferences, users, tenants, type AppPreferencesBlob, type DbOrTx } from "@money-matters/db";
import { COUNTRY_DEFAULTS } from "@money-matters/types";
import { and, eq, sql } from "drizzle-orm";

function getCountryDefaults(country?: string | null) {
  return country
    ? (COUNTRY_DEFAULTS as Record<string, { locale?: string; phoneCountryCode?: string; timezone?: string }>)[country]
    : null;
}

export async function getUserPreferencesHandler(userId: string, tenantId: string, appId: string, db: DbOrTx) {
  const [globalPref] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
  const [tenantPref] = await db
    .select()
    .from(tenantUserPreferences)
    .where(and(eq(tenantUserPreferences.userId, userId), eq(tenantUserPreferences.tenantId, tenantId), eq(tenantUserPreferences.appId, appId)));
  const [currentTenant] = tenantId ? await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1) : [null];

  const setupStatus = (currentTenant?.setupStatus as "PENDING" | "CANCELLED" | "COMPLETED") || "PENDING";
  const setupCompleted = setupStatus === "COMPLETED" || setupStatus === "CANCELLED" || Boolean(currentTenant?.setupCompletedAt);
  const countryDefaults = getCountryDefaults(currentTenant?.country);

  return {
    id: globalPref?.id || tenantPref?.id,
    userId,
    tenantId,
    appId,
    timezone: globalPref?.timezone || currentTenant?.timezone || "Australia/Sydney",
    tenantTimezone: currentTenant?.timezone || "Australia/Sydney",
    currency: currentTenant?.currency || "AUD",
    country: currentTenant?.country || "AU",
    language: (globalPref?.language as "en") || "en",
    locale: currentTenant?.country ? (countryDefaults?.locale || `en-${currentTenant.country}`) : "en-AU",
    theme: globalPref?.theme ?? "system",
    showIcons: globalPref?.showIcons ?? true,
    notificationEmail: globalPref?.notificationEmail ?? null,
    phoneCountryCode:
      globalPref?.phoneCountryCode && globalPref.phoneCountryCode !== "+61"
        ? globalPref.phoneCountryCode
        : (countryDefaults?.phoneCountryCode || globalPref?.phoneCountryCode || "+61"),
    phoneNumber: globalPref?.phoneNumber ?? null,
    setupCompleted,
    setupStatus,
    setupCompletedAt: currentTenant?.setupCompletedAt?.toISOString() || null,
    appPreferences: tenantPref?.appPreferences ?? {},
  };
}

export async function updateUserPreferencesHandler(
  input: {
    timezone?: string;
    language?: "en";
    theme?: string;
    showIcons?: boolean;
    setupCompleted?: boolean;
    appPreferences?: Record<string, Record<string, unknown>>;
  },
  userId: string,
  tenantId: string,
  appId: string,
  db: DbOrTx
) {
  const [existingGlobal] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
  if (existingGlobal) {
    await db
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
    await db.insert(userPreferences).values({
      userId,
      theme: input.theme ?? "system",
      showIcons: input.showIcons ?? true,
      language: input.language ?? "en",
      timezone: input.timezone || null,
    });
  }

  const [existingTenantPref] = await db
    .select()
    .from(tenantUserPreferences)
    .where(and(eq(tenantUserPreferences.userId, userId), eq(tenantUserPreferences.tenantId, tenantId), eq(tenantUserPreferences.appId, appId)));

  const existingAppPrefs: Record<string, AppPreferencesBlob> = existingTenantPref?.appPreferences || {};
  const updatedAppBlob: AppPreferencesBlob = {
    ...(existingAppPrefs[appId] || {}),
    ...(input.appPreferences?.[appId] ? input.appPreferences[appId] : {}),
  };
  const updatedAppPrefs: Record<string, AppPreferencesBlob> = {
    ...existingAppPrefs,
    ...input.appPreferences,
    [appId]: updatedAppBlob,
  };

  if (existingTenantPref) {
    await db.update(tenantUserPreferences).set({ appPreferences: updatedAppPrefs, updatedAt: new Date() }).where(eq(tenantUserPreferences.id, existingTenantPref.id));
  } else {
    await db.insert(tenantUserPreferences).values({ userId, tenantId, appId, appPreferences: updatedAppPrefs });
  }

  if (input.setupCompleted !== undefined && tenantId) {
    await db
      .update(tenants)
      .set({
        setupStatus: input.setupCompleted ? "COMPLETED" : "PENDING",
        setupCompletedAt: input.setupCompleted ? new Date() : null,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(tenants.id, tenantId));
  }

  return { success: true };
}

export async function getUserProfileHandler(userId: string, tenantId: string | null | undefined, db: DbOrTx) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  const [pref] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
  const [tenantObj] = tenantId ? await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1) : [null];
  const defaults = getCountryDefaults(tenantObj?.country);

  return {
    id: userId,
    email: u?.email || "",
    displayName: u?.displayName || "",
    avatarUrl: u?.avatarUrl || null,
    notificationEmail: pref?.notificationEmail || u?.email || "",
    phoneCountryCode: pref?.phoneCountryCode && pref.phoneCountryCode !== "+61" ? pref.phoneCountryCode : (defaults?.phoneCountryCode || pref?.phoneCountryCode || "+61"),
    phoneNumber: pref?.phoneNumber || "",
    timezone: pref?.timezone || tenantObj?.timezone || defaults?.timezone || "Australia/Sydney",
    showIcons: pref?.showIcons ?? true,
  };
}

export async function updateUserProfileHandler(
  input: { displayName: string; notificationEmail: string; phoneCountryCode?: string; phoneNumber?: string; avatarUrl?: string },
  userId: string,
  db: DbOrTx
) {
  await db
    .update(users)
    .set({
      displayName: input.displayName,
      avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : undefined,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  try {
    await db.execute(sql`UPDATE neon_auth.user SET name = ${input.displayName}, image = ${input.avatarUrl || null} WHERE id = ${userId}`);
  } catch {
    // Non-blocking: neon_auth.user table may not exist in mock DB or test environments
  }

  const [existingPref] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
  if (existingPref) {
    await db
      .update(userPreferences)
      .set({
        notificationEmail: input.notificationEmail,
        phoneCountryCode: input.phoneCountryCode ?? existingPref.phoneCountryCode,
        phoneNumber: input.phoneNumber !== undefined ? (input.phoneNumber || null) : existingPref.phoneNumber,
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.id, existingPref.id));
  } else {
    await db.insert(userPreferences).values({
      userId,
      notificationEmail: input.notificationEmail,
      phoneCountryCode: input.phoneCountryCode || "+61",
      phoneNumber: input.phoneNumber || null,
    });
  }

  return { success: true };
}
