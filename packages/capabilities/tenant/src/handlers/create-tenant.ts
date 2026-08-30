import { z } from "zod";
import { tenants, tenantUsers, appCategories, pools, categories, bankAccounts, apps, users, DbOrTx } from "@money-matters/db";
import { CreateTenantCommand } from "@money-matters/types";
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
    const trialGraceEndsAt = new Date(now.getTime() + 67 * 24 * 60 * 60 * 1000);

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

    // 1. Insert the tenant
    await db
      .insert(tenants)
      .values({
        id: tenantId,
        appId,
        name: input.name,
        subscriptionStatus: "TRIAL_ACTIVE",
        trialStartedAt,
        trialEndsAt,
        trialGraceEndsAt,
        createdBy: userId,
        updatedBy: userId,
      });

    // 2. Add the owner record to tenant_users
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

    // 3. Create default 'Primary Account'
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

    // 4. Create default Pools on Primary Account
    const [everydayPool] = await db
      .insert(pools)
      .values({
        tenantId,
        appId,
        name: "Everyday Spending",
        poolType: "EVERYDAY",
        bankAccountId: primaryAccount.id,
        everydayAllowanceAmount: "1000.00",
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    const [billsPool] = await db
      .insert(pools)
      .values({
        tenantId,
        appId,
        name: "Regular Bills",
        poolType: "REGULAR",
        bankAccountId: primaryAccount.id,
        rolloverRule: "ROLLOVER",
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    await db
      .insert(pools)
      .values({
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
      });

    // 5. Seed default sub-tag categories into Everyday and Bills pools
    const templates = await db
      .select()
      .from(appCategories)
      .where(eq(appCategories.appId, appId));

    const defaultTemplates = templates.length > 0
      ? templates.map((t) => ({
          name: t.name,
          type: t.type,
          icon: t.icon,
          colour: t.colour,
          monthlyAmount: t.annualisedAmount ? String((Number(t.annualisedAmount) / 12).toFixed(2)) : null,
        }))
      : [
          { name: "Groceries & Food Supplies", type: "EVERYDAY" as const, icon: "shopping-cart", colour: "#10B981", monthlyAmount: "1170.00" },
          { name: "Dining Out & Coffee", type: "EVERYDAY" as const, icon: "coffee", colour: "#F59E0B", monthlyAmount: "1040.00" },
          { name: "Petrol & Fuel", type: "EVERYDAY" as const, icon: "navigation", colour: "#3B82F6", monthlyAmount: "260.00" },
          { name: "Public Transport & Rideshare", type: "EVERYDAY" as const, icon: "truck", colour: "#8B5CF6", monthlyAmount: "180.00" },
          { name: "Personal Care & Fun", type: "EVERYDAY" as const, icon: "smile", colour: "#EC4899", monthlyAmount: "430.00" },
          { name: "Everyday Incidental Buffer", type: "EVERYDAY" as const, icon: "wallet", colour: "#00B4A6", monthlyAmount: "300.00" },
          { name: "Rent & Housing", type: "REGULAR" as const, icon: "home", colour: "#EF4444", monthlyAmount: "2400.00" },
          { name: "Electricity & Utilities", type: "REGULAR" as const, icon: "zap", colour: "#F59E0B", monthlyAmount: "300.00" },
        ];

    await db.insert(categories).values(
      defaultTemplates.map((template) => {
        const poolId = template.type === "EVERYDAY" ? everydayPool.id : billsPool.id;
        return {
          tenantId,
          appId,
          poolId,
          name: template.name,
          icon: template.icon,
          colour: template.colour,
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
