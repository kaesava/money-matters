import { z } from "zod";
import { bankAccounts, categories } from "@money-matters/db";
import { CreateBankAccountCommand, UpdateBankAccountCommand } from "@money-matters/types";
import { eq, and, sql } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";

/**
 * Creates a new bank account within the tenant scope.
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
 */
export function archiveBankAccountHandler(db: PgDatabase<any, any, any>) {
  return async (
    accountId: string, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
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
