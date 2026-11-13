import { z } from "zod";
import { tenants, tenantUsers, envelopes, bankAccounts, apps, users, userPreferences, DbOrTx } from "@money-matters/db";
import { CreateTenantCommand, COUNTRY_DEFAULTS } from "@money-matters/types";
import { eq, and, isNull, or, sql } from "drizzle-orm";

export const DEFAULT_BANK_ACCOUNT_NAME = "Other Financial Institution (Everyday)";
export const DEFAULT_EVERYDAY_ENVELOPE_NAME = "Everyday Spending";

/**
 * Seeds the absolute minimum workspace: ONE bank account and the single shared Everyday envelope
 * linked to it (also the surplus target). Never creates Bill/Goal envelopes or Income Schedules.
 * Pass existing ids to make the call idempotent.
 */
export async function seedMinimalWorkspace(
  db: DbOrTx,
  params: {
    tenantId: string;
    appId: string;
    userId: string;
    existingBankAccountId?: string | null;
    existingEverydayEnvelopeId?: string | null;
    hasEverydayEnvelope?: boolean;
  }
): Promise<{ bankAccountId: string; everydayEnvelopeId: string | null }> {
  const { tenantId, appId, userId } = params;
  let bankAccountId = params.existingBankAccountId ?? null;
  if (!bankAccountId) {
    const [acc] = await db.insert(bankAccounts).values({
      tenantId, appId, name: DEFAULT_BANK_ACCOUNT_NAME, bankProvider: "Other", accountType: "EVERYDAY",
      lastKnownBalance: "0.00", unbudgetedBuffer: "0.00", isPrivate: false, createdBy: userId, updatedBy: userId,
    }).returning();
    bankAccountId = acc.id;
  }
  let everydayEnvelopeId = params.existingEverydayEnvelopeId ?? null;
  if (!everydayEnvelopeId && !params.hasEverydayEnvelope) {
    const ins = await db.insert(envelopes).values({
      tenantId, appId, bankAccountId, name: DEFAULT_EVERYDAY_ENVELOPE_NAME, envelopeType: "EVERYDAY",
      fundingMode: "TARGET_BALANCE", monthlyAmount: "0.00", budgetFrequency: "MONTHLY", isPriority: true,
      isSurplusTarget: true, isPrivate: false, orderIndex: 0, createdBy: userId, updatedBy: userId,
    }).returning();
    everydayEnvelopeId = Array.isArray(ins) && ins[0]?.id ? ins[0].id : null;
  }
  return { bankAccountId, everydayEnvelopeId };
}

/**
 * Creates a new tenant scope and assigns the creator user as OWNER.
 */
export function createTenantHandler(db: DbOrTx) {
  return async (
    input: z.infer<typeof CreateTenantCommand>,
    appId: string,
    userId: string,
    userEmail?: string
  ) => {
    const tenantId = crypto.randomUUID();
    const now = new Date();
    const trialStartedAt = now;
    const trialEndsAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // 0. Guard app and user mirror records
    await db
      .insert(apps)
      .values({
        id: appId,
        name: "Money Matters",
        slug: "money-matters",
      })
      .onConflictDoNothing();

    await db
      .insert(users)
      .values({
        id: userId,
        email: userEmail || `user-${userId.substring(0, 8)}@moneymatters.kaesava.au`,
        displayName: "User",
      })
      .onConflictDoNothing();

    // 1. Guard against owning more than one active household
    const [existingOwnedTenant] = await db
      .select({ id: tenantUsers.tenantId })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
      .where(
        and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.role, "OWNER"),
          eq(tenants.appId, appId),
          isNull(tenantUsers.archivedAt),
          isNull(tenants.archivedAt)
        )
      )
      .limit(1);

    if (existingOwnedTenant) {
      throw new Error("You already have an active household. An account can only own one active household at a time.");
    }

    // 2. Check if user or email already used their 60-day trial across the platform
    const normalizedEmail = userEmail?.trim().toLowerCase();
    const matchedUsers = normalizedEmail
      ? await db
          .select({ hasUsedTrial: users.hasUsedTrial })
          .from(users)
          .where(or(eq(users.id, userId), sql`lower(${users.email}) = ${normalizedEmail}`))
      : await db
          .select({ hasUsedTrial: users.hasUsedTrial })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

    const hasUsedTrial = matchedUsers.some((u: { hasUsedTrial?: boolean }) => Boolean(u.hasUsedTrial));
    const subscriptionStatus = hasUsedTrial ? "TRIAL_EXPIRED" : "TRIAL_ACTIVE";

    const country = input.country || "AU";
    const countryDefaults =
      (COUNTRY_DEFAULTS as Record<string, { currency: string; timezone: string; phoneCountryCode: string }>)[country] ||
      COUNTRY_DEFAULTS["AU"];
    const currency = input.currency || countryDefaults.currency;
    const timezone = input.timezone || countryDefaults.timezone;

    // 3. Insert the tenant
    await db
      .insert(tenants)
      .values({
        id: tenantId,
        appId,
        name: input.name,
        country,
        currency,
        timezone,
        subscriptionStatus,
        trialStartedAt: hasUsedTrial ? null : trialStartedAt,
        trialEndsAt: hasUsedTrial ? null : trialEndsAt,
        cancelAtPeriodEnd: false,
        createdBy: userId,
        updatedBy: userId,
      });

    // Mark that the user has consumed their initial trial allocation
    await db
      .update(users)
      .set({ hasUsedTrial: true, updatedAt: now })
      .where(
        normalizedEmail
          ? or(eq(users.id, userId), sql`lower(${users.email}) = ${normalizedEmail}`)
          : eq(users.id, userId)
      );

    // 4. Add the owner record to tenant_users
    await db
      .insert(tenantUsers)
      .values({
        tenantId,
        userId,
        role: "OWNER" as const,
        inviteStatus: "ACCEPTED" as const,
        createdBy: userId,
        updatedBy: userId,
      });

    // 5. Initialize or synchronize userPreferences with country defaults
    const phoneCountryCode = countryDefaults.phoneCountryCode || "+61";

    const [existingPref] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (existingPref) {
      await db
        .update(userPreferences)
        .set({
          timezone,
          phoneCountryCode: existingPref.phoneCountryCode || phoneCountryCode,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(eq(userPreferences.id, existingPref.id));
    } else {
      await db
        .insert(userPreferences)
        .values({
          userId,
          timezone,
          phoneCountryCode,
          createdBy: userId,
          updatedBy: userId,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

    await seedMinimalWorkspace(db, { tenantId, appId, userId });

    return {
      success: true,
      tenantId,
    };
  };
}

/**
 * Fetches tenant details, member users, active bank accounts, and envelopes.
 */
export function getTenantHandler(db: DbOrTx) {
  return async (tenantId: string, appId: string) => {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(
        and(
          eq(tenants.id, tenantId),
          eq(tenants.appId, appId),
          isNull(tenants.archivedAt)
        )
      )
      .limit(1);

    if (!tenant) return null;

    const tenantMemberList = await db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenant.id),
          isNull(tenantUsers.archivedAt)
        )
      );

    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.tenantId, tenant.id),
          eq(bankAccounts.appId, appId),
          isNull(bankAccounts.archivedAt)
        )
      );

    const tenantPools = await db
      .select()
      .from(envelopes)
      .where(
        and(
          eq(envelopes.tenantId, tenant.id),
          eq(envelopes.appId, appId),
          isNull(envelopes.archivedAt)
        )
      );

    return {
      ...tenant,
      users: tenantMemberList,
      bankAccounts: accounts,
      envelopes: tenantPools,
    };
  };
}
