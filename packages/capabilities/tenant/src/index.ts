import { z } from "zod";
import { tenants, tenantUsers, bankAccounts } from "@money-matters/db";
import { 
  CreateTenantCommand, 
  CreateBankAccountCommand, 
  UpdateBankAccountCommand 
} from "@money-matters/types";
import { eq, and, sql } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";

export function createTenantHandler(db: PgDatabase<any, any, any>) {
  return async (input: z.infer<typeof CreateTenantCommand>, appId: string, userId: string) => {
    // Pre-generate the tenant UUID so tenantId = tenantId in a single INSERT.
    // The tenants table uses defaultRandom() but we need the ID before insert
    // so we can set tenantId = id (the tenant is its own tenant scope).
    const tenantId = crypto.randomUUID();

    // 1. Insert the tenant with tenantId = its own id
    await db
      .insert(tenants)
      .values({
        id: tenantId,
        tenantId: tenantId, // tenantId = tenantId ✓ (not userId)
        appId,
        name: input.name,
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

    return {
      success: true,
      tenantId,
    };
  };
}

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
        purpose: input.purpose,
        lastKnownBalance: input.lastKnownBalance,
        isOffset: input.isOffset,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return bankAccount;
  };
}

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

export function archiveBankAccountHandler(db: PgDatabase<any, any, any>) {
  return async (
    accountId: string, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
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
