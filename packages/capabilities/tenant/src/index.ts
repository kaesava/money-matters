/**
 * Capability Tenant & Bank Account Management
 * 
 * Provides command handlers for tenant creation, user membership binding, bank account management,
 * and tenant configuration queries.
 */
import { z } from "zod";
import { tenants, tenantUsers, bankAccounts, categories, transactionLedger, appCategories } from "@money-matters/db";
import { 
  CreateTenantCommand, 
  CreateBankAccountCommand, 
  UpdateBankAccountCommand
} from "@money-matters/types";
import { eq, and, sql, inArray } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";

/**
 * Creates a new tenant scope and assigns the creator user as OWNER.
 *
 * @param db - Drizzle PostgreSQL database client
 * @returns Command execution handler function
 */
export function createTenantHandler(db: PgDatabase<any, any, any>) {
  return async (input: z.infer<typeof CreateTenantCommand>, appId: string, userId: string) => {
    // Pre-generate the tenant UUID so tenantId = tenantId in a single INSERT.
    // The tenants table uses defaultRandom() but we need the ID before insert
    // so we can set tenantId = id (the tenant is its own tenant scope).
    const tenantId = crypto.randomUUID();

    const now = new Date();
    const trialStartedAt = now;
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const trialGraceEndsAt = new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000);

    // 1. Insert the tenant with tenantId = its own id and initial trial state
    await db
      .insert(tenants)
      .values({
        id: tenantId,
        tenantId: tenantId, // tenantId = tenantId ✓ (not userId)
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
    //    userId → public.users.id (already upserted in createContext before this call)
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

    // 3. Seed default categories from app_categories template
    //    Only applies to new tenants — existing tenants are not backfilled.
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
          { name: "Everyday Spending", type: "EVERYDAY" as const, icon: "wallet", colour: "#00B4A6", monthlyAmount: "800.00" },
          { name: "Rent & Housing", type: "REGULAR" as const, icon: "home", colour: "#EF4444", monthlyAmount: "2400.00" },
          { name: "Groceries & Food", type: "REGULAR" as const, icon: "shopping-cart", colour: "#10B981", monthlyAmount: "1000.00" },
          { name: "Electricity & Utilities", type: "REGULAR" as const, icon: "zap", colour: "#F59E0B", monthlyAmount: "300.00" },
          { name: "Emergency Reserve", type: "GOAL" as const, icon: "shield", colour: "#6366F1", monthlyAmount: null },
        ];

    let hasSeededEveryday = false;
    await db.insert(categories).values(
      defaultTemplates.map((template) => {
        const isEveryday = template.type === "EVERYDAY";
        const isDefaultExcess = isEveryday && !hasSeededEveryday;
        if (isEveryday) hasSeededEveryday = true;

        return {
          tenantId,
          appId,
          name: template.name,
          type: template.type,
          icon: template.icon,
          colour: template.colour,
          monthlyAmount: template.monthlyAmount,
          rolloverRule: "ROLLOVER" as const,
          isDefaultExcess,
          isDefaultSavings: false,
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
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return {
      success: true,
      inviteToken: created.inviteToken,
      inviteEmail: created.inviteEmail,
    };
  };
}

/**
 * Accepts a household partner invitation.
 */
export function acceptInviteHandler(db: PgDatabase<any, any, any>) {
  return async (input: { inviteToken: string }, userId: string) => {
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
 * Creates a new bank account within the tenant scope.
 *
 * @param db - Drizzle PostgreSQL database client
 * @returns Command handler creating bank account records
 */
export function createBankAccountHandler(db: PgDatabase<any, any, any>) {
  return async (
    input: z.infer<typeof CreateBankAccountCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [bankAccount] = await db
      .insert(bankAccounts)
      .values({
        tenantId: tenantId,
        name: input.name,
        lastKnownBalance: input.lastKnownBalance,
        unbudgetedBuffer: input.unbudgetedBuffer,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return bankAccount;
  };
}

/**
 * Updates an existing bank account within the tenant scope.
 *
 * @param db - Drizzle PostgreSQL database client
 * @returns Command handler updating bank account parameters
 */
export function updateBankAccountHandler(db: PgDatabase<any, any, any>) {
  return async (
    accountId: string, 
    input: z.infer<typeof UpdateBankAccountCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [updated] = await db
      .update(bankAccounts)
      .set({
        ...input,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bankAccounts.id, accountId),
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId),
          sql`${bankAccounts.archivedAt} IS NULL`
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Bank account not found or access unauthorized.");
    }

    return updated;
  };
}

/**
 * Archives a bank account within the tenant scope after ensuring no linked categories exist.
 *
 * @param db - Drizzle PostgreSQL database client
 * @returns Command handler performing soft-delete archiving
 */
export function archiveBankAccountHandler(db: PgDatabase<any, any, any>) {
  return async (
    accountId: string, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    // 1. Check for linked categories
    const linkedCategories = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.bankAccountId, accountId),
          sql`${categories.archivedAt} IS NULL`
        )
      );

    if (linkedCategories.length > 0) {
      throw new Error("Cannot archive a bank account that has active categories linked to it.");
    }

    const [archived] = await db
      .update(bankAccounts)
      .set({
        archivedAt: new Date(),
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bankAccounts.id, accountId),
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId),
          sql`${bankAccounts.archivedAt} IS NULL`
        )
      )
      .returning();

    if (!archived) {
      throw new Error("Bank account not found or access unauthorized.");
    }

    return { success: true };
  };
}

/**
 * Fetches tenant details, member users, and active bank accounts.
 *
 * @param db - Drizzle PostgreSQL database client
 * @returns Query handler returning aggregated tenant object
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

export * from "./export-data.js";
export * from "./delete-account.js";


