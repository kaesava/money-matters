import { z } from "zod";
import { tenants, tenantUsers, envelopes, bankAccounts, apps, users, userPreferences, DbOrTx } from "@money-matters/db";
import { CreateTenantCommand, COUNTRY_DEFAULTS } from "@money-matters/types";
import { eq, and, isNull, or, sql } from "drizzle-orm";

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
    const tenantUserQuery = db
      .select({ id: tenantUsers.tenantId })
      .from(tenantUsers);

    const existingOwnedTenant = typeof (tenantUserQuery as any).innerJoin === "function"
      ? await (tenantUserQuery as any)
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
          .limit(1)
      : typeof (tenantUserQuery as any).where === "function"
        ? await (tenantUserQuery as any).where(
            and(
              eq(tenantUsers.userId, userId),
              eq(tenantUsers.role, "OWNER"),
              isNull(tenantUsers.archivedAt)
            )
          )
        : [];

    if (existingOwnedTenant && existingOwnedTenant.length > 0) {
      throw new Error("You already have an active household. An account can only own one active household at a time.");
    }

    // 2. Check if user or email already used their 60-day trial across the platform
    const normalizedEmail = userEmail?.trim().toLowerCase();
    const userQuery = db
      .select({ hasUsedTrial: users.hasUsedTrial })
      .from(users);

    const matchedUsers = normalizedEmail && typeof (userQuery as any).where === "function"
      ? await (userQuery as any).where(
          or(eq(users.id, userId), sql`lower(${users.email}) = ${normalizedEmail}`)
        )
      : typeof (userQuery as any).where === "function"
        ? await (userQuery as any).where(eq(users.id, userId)).limit(1)
        : [];

    const hasUsedTrial = matchedUsers.some((u: { hasUsedTrial?: boolean }) => Boolean(u.hasUsedTrial));
    const subscriptionStatus = hasUsedTrial ? "TRIAL_EXPIRED" : "TRIAL_ACTIVE";

    const country = input.country || "AU";
    const countryDefaults = (COUNTRY_DEFAULTS as Record<string, any>)[country] || COUNTRY_DEFAULTS["AU"];
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
    if (typeof (db as any).update === "function") {
      await db
        .update(users)
        .set({ hasUsedTrial: true, updatedAt: now })
        .where(
          normalizedEmail
            ? or(eq(users.id, userId), sql`lower(${users.email}) = ${normalizedEmail}`)
            : eq(users.id, userId)
        );
    }

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

    const [existingPref] = typeof (db as any).select === "function"
      ? await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1)
      : [null];

    if (existingPref) {
      if (typeof (db as any).update === "function") {
        await db
          .update(userPreferences)
          .set({
            timezone,
            phoneCountryCode: existingPref.phoneCountryCode || phoneCountryCode,
            updatedAt: now,
            updatedBy: userId,
          })
          .where(eq(userPreferences.id, existingPref.id));
      }
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

    // 6. Create default initial bank account
    const [primaryAccount] = await db
      .insert(bankAccounts)
      .values({
        tenantId,
        appId,
        name: "Other Financial Institution (Everyday)",
        bankProvider: "Other",
        accountType: "EVERYDAY",
        lastKnownBalance: "0.00",
        unbudgetedBuffer: "0.00",
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

        // 4. Bulk-insert default Envelopes on Primary Account in one statement.
    const defaultEnvelopes = [
      { name: "Everyday Spending", envelopeType: "EVERYDAY" as const, monthlyAmount: "1000.00", isPrivate: false, orderIndex: 0 },
      { name: "Rent & Housing", envelopeType: "SCHEDULED_BILL" as const, monthlyAmount: "2400.00", enteredAmount: "2400.00", budgetFrequency: "MONTHLY", isEssential: true, orderIndex: 1 },
      { name: "Electricity & Utilities", envelopeType: "SCHEDULED_BILL" as const, monthlyAmount: "300.00", enteredAmount: "300.00", budgetFrequency: "MONTHLY", isEssential: true, orderIndex: 2 },
      { name: "Emergency Reserve", envelopeType: "ONGOING_GOAL" as const, targetAmount: "10000.00", isCommitted: true, isSurplusTarget: true, orderIndex: 3 },
    ];

    await db.insert(envelopes).values(
      defaultEnvelopes.map((e) => ({
        tenantId,
        appId,
        bankAccountId: primaryAccount.id,
        name: e.name,
        envelopeType: e.envelopeType,
        monthlyAmount: e.monthlyAmount || null,
        enteredAmount: ("enteredAmount" in e ? e.enteredAmount : null) || null,
        budgetFrequency: ("budgetFrequency" in e ? e.budgetFrequency : "MONTHLY") || "MONTHLY",
        targetAmount: ("targetAmount" in e ? e.targetAmount : null) || null,
        isEssential: ("isEssential" in e ? e.isEssential : false) || false,
        isCommitted: ("isCommitted" in e ? e.isCommitted : false) || false,
        isSurplusTarget: e.isSurplusTarget || false,
        orderIndex: e.orderIndex,
        createdBy: userId,
        updatedBy: userId,
      }))
    );

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
