import { z } from "zod";
import { tenants, tenantUsers, appCategories, categories, bankAccounts, bankAccountCategoryMappings, apps, users } from "@money-matters/db";
import { CreateTenantCommand } from "@money-matters/types";
import { eq, and, sql } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";

/**
 * Creates a new tenant scope and assigns the creator user as OWNER.
 */
export function createTenantHandler(db: PgDatabase<any, any, any>) {
  return async (input: z.infer<typeof CreateTenantCommand>, appId: string, userId: string) => {
    const tenantId = crypto.randomUUID();
    const now = new Date();
    const trialStartedAt = now;
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const trialGraceEndsAt = new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000);

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

    // 1. Insert the tenant with tenantId = its own id
    await db
      .insert(tenants)
      .values({
        id: tenantId,
        tenantId: tenantId,
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
        appId,
        createdBy: userId,
        updatedBy: userId,
      });

    // 3. Create default 'Primary Account' and link all three category types
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

    await db.insert(bankAccountCategoryMappings).values([
      {
        tenantId,
        appId,
        categoryType: "EVERYDAY" as const,
        bankAccountId: primaryAccount.id,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        tenantId,
        appId,
        categoryType: "REGULAR" as const,
        bankAccountId: primaryAccount.id,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        tenantId,
        appId,
        categoryType: "GOAL" as const,
        bankAccountId: primaryAccount.id,
        createdBy: userId,
        updatedBy: userId,
      },
    ]);

    // 3. Seed default categories from app_categories template
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
          { name: "Emergency Reserve", type: "GOAL" as const, icon: "shield", colour: "#6366F1", monthlyAmount: null },
        ];

    await db.insert(categories).values(
      defaultTemplates.map((template) => {
        return {
          tenantId,
          appId,
          name: template.name,
          type: template.type,
          icon: template.icon,
          colour: template.colour,
          monthlyAmount: template.monthlyAmount,
          enteredAmount: template.monthlyAmount,
          budgetFrequency: "MONTHLY",
          rolloverRule: "ROLLOVER" as const,
          isCommitted: false,
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
 * Invites a partner to join the household tenant.
 */
export function invitePartnerHandler(db: PgDatabase<any, any, any>) {
  return async (
    input: { email: string },
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    const inviteToken = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const [created] = await db
      .insert(tenantUsers)
      .values({
        tenantId,
        appId,
        inviteEmail: input.email,
        inviteToken,
        inviteStatus: "PENDING" as const,
        role: "MEMBER" as const,
        invitedAt: now,
        expiresAt,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return {
      success: true,
      inviteToken: created.inviteToken,
      inviteEmail: created.inviteEmail,
      expiresAt: created.expiresAt,
    };
  };
}

/**
 * Accepts a household partner invitation after verifying token expiry and email identity.
 */
export function acceptInviteHandler(db: PgDatabase<any, any, any>) {
  return async (input: { inviteToken: string }, userId: string, userEmail?: string) => {
    const [invite] = await db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.inviteToken, input.inviteToken),
          eq(tenantUsers.inviteStatus, "PENDING")
        )
      )
      .limit(1);

    if (!invite) {
      throw new Error("Invalid or expired invitation token.");
    }

    if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
      throw new Error("Invitation token has expired. Please request a new invitation from the household owner.");
    }

    if (invite.inviteEmail && userEmail && invite.inviteEmail.trim().toLowerCase() !== userEmail.trim().toLowerCase()) {
      throw new Error("Invitation email does not match authenticated user email.");
    }

    const [updated] = await db
      .update(tenantUsers)
      .set({
        userId,
        inviteStatus: "ACCEPTED" as const,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(tenantUsers.id, invite.id))
      .returning();

    return {
      success: true,
      tenantId: updated.tenantId,
      role: updated.role,
    };
  };
}

/**
 * Fetches tenant details, member users, and active bank accounts.
 */
export function getTenantHandler(db: PgDatabase<any, any, any>) {
  return async (tenantId: string, appId: string) => {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(
        and(
          eq(tenants.tenantId, tenantId),
          eq(tenants.appId, appId),
          sql`${tenants.archivedAt} IS NULL`
        )
      )
      .limit(1);

    if (!tenant) return null;

    const users = await db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenant.id),
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.appId, appId),
          sql`${tenantUsers.archivedAt} IS NULL`
        )
      );

    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.tenantId, tenant.id),
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId),
          sql`${bankAccounts.archivedAt} IS NULL`
        )
      );

    return {
      ...tenant,
      users,
      bankAccounts: accounts,
    };
  };
}
