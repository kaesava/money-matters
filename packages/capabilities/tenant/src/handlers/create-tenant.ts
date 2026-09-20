import { z } from "zod";
import { tenants, tenantUsers, pools, categories, bankAccounts, apps, users, userPreferences, DbOrTx } from "@money-matters/db";
import { CreateTenantCommand, COUNTRY_DEFAULTS } from "@money-matters/types";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Creates a new tenant scope and assigns the creator user as OWNER.
 */
export function createTenantHandler(db: DbOrTx) {
  return async (input: z.infer<typeof CreateTenantCommand>, appId: string, userId: string) => {
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
        email: `user-${userId.substring(0, 8)}@moneymatters.kaesava.au`,
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

    // 2. Check if user already used their 60-day trial
    const [existingUser] = await db
      .select({ hasUsedTrial: users.hasUsedTrial })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const hasUsedTrial = existingUser?.hasUsedTrial ?? false;
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
        .where(eq(users.id, userId));
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
    const locale = countryDefaults.locale || "en-AU";
    const phoneCountryCode = countryDefaults.phoneCountryCode || "+61";

    const [existingPref] = typeof (db as any).select === "function"
      ? await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1)
      : [null];

    if (existingPref) {
      if (typeof (db as any).update === "function") {
        await db
          .update(userPreferences)
          .set({
            locale,
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
          locale,
          timezone,
          phoneCountryCode,
          createdBy: userId,
          updatedBy: userId,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

    // 6. Create default 'Primary Account'
    const [primaryAccount] = await db
      .insert(bankAccounts)
      .values({
        tenantId,
        appId,
        name: "Primary Account",
        lastKnownBalance: "0.00",
        unbudgetedBuffer: "0.00",
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    // 4. Bulk-insert default Pools on Primary Account in one statement.
    // FK ordering requires primaryAccount.id to exist first (step 3 above).
    const [everydayPool, billsPool] = await db
      .insert(pools)
      .values([
        {
          tenantId,
          appId,
          name: "Everyday Spending",
          poolType: "EVERYDAY",
          bankAccountId: primaryAccount.id,
          everydayAllowanceAmount: "1000.00",
          createdBy: userId,
          updatedBy: userId,
        },
        {
          tenantId,
          appId,
          name: "Regular Bills",
          poolType: "REGULAR",
          bankAccountId: primaryAccount.id,
          createdBy: userId,
          updatedBy: userId,
        },
        {
          tenantId,
          appId,
          name: "Emergency Reserve",
          poolType: "GOAL",
          bankAccountId: primaryAccount.id,
          targetAmount: "10000.00",
          isCommitted: true,
          isSurplusTarget: true,
          createdBy: userId,
          updatedBy: userId,
        },
      ])
      .returning();

    // 5. Seed default sub-tag categories into Everyday and Bills pools
    const defaultTemplates = [
      { name: "Groceries & Food Supplies", type: "EVERYDAY" as const, icon: "shopping-cart", monthlyAmount: "1170.00" },
      { name: "Dining Out & Coffee", type: "EVERYDAY" as const, icon: "coffee", monthlyAmount: "1040.00" },
      { name: "Petrol & Fuel", type: "EVERYDAY" as const, icon: "navigation", monthlyAmount: "260.00" },
      { name: "Public Transport & Rideshare", type: "EVERYDAY" as const, icon: "truck", monthlyAmount: "180.00" },
      { name: "Personal Care & Fun", type: "EVERYDAY" as const, icon: "smile", monthlyAmount: "430.00" },
      { name: "Everyday Incidental Buffer", type: "EVERYDAY" as const, icon: "wallet", monthlyAmount: "300.00" },
      { name: "Rent & Housing", type: "REGULAR" as const, icon: "home", monthlyAmount: "2400.00" },
      { name: "Electricity & Utilities", type: "REGULAR" as const, icon: "zap", monthlyAmount: "300.00" },
    ];

    await db.insert(categories).values(
      defaultTemplates.map((template) => {
        const poolId = template.type === "EVERYDAY" ? everydayPool.id : (billsPool?.id || everydayPool.id);
        return {
          tenantId,
          appId,
          poolId,
          name: template.name,
          icon: template.icon,
          monthlyAmount: template.monthlyAmount,
          enteredAmount: template.monthlyAmount,
          budgetFrequency: "MONTHLY",
          isEssential: template.name.includes("Rent") || template.name.includes("Electricity"),
          createdBy: userId,
          updatedBy: userId,
        };
      })
    );

    return {
      success: true,
      tenantId,
    };
  };
}

/**
 * Fetches tenant details, member users, active bank accounts, and pools.
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
      .from(pools)
      .where(
        and(
          eq(pools.tenantId, tenant.id),
          eq(pools.appId, appId),
          isNull(pools.archivedAt)
        )
      );

    return {
      ...tenant,
      users: tenantMemberList,
      bankAccounts: accounts,
      pools: tenantPools,
    };
  };
}
