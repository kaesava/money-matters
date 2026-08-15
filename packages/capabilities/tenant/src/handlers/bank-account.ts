import { z } from "zod";
import { bankAccounts, bankAccountCategoryMappings, DbOrTx } from "@money-matters/db";
import { CreateBankAccountCommand, UpdateBankAccountCommand } from "@money-matters/types";
import { eq, and, sql, or, ne } from "drizzle-orm";
import { ensurePremiumAccess } from "@money-matters/capability-billing";

export const UpdateBankAccountMappingsSchema = z.object({
  mappings: z.array(
    z.object({
      categoryType: z.enum(["EVERYDAY", "REGULAR", "GOAL"]),
      bankAccountId: z.string().uuid(),
    })
  ),
});

/**
 * Lists bank accounts for a tenant alongside their associated category types, respecting private bank account ownership.
 */
export function getBankAccountsWithMappingsHandler(db: DbOrTx) {
  return async (tenantId: string, appId: string, userId?: string) => {
    const accountFilters = [
      eq(bankAccounts.tenantId, tenantId),
      eq(bankAccounts.appId, appId),
      sql`${bankAccounts.archivedAt} IS NULL`,
    ];

    if (userId) {
      accountFilters.push(or(eq(bankAccounts.isPrivate, false), eq(bankAccounts.userId, userId))!);
    }

    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(and(...accountFilters));

    const mappings = await db
      .select()
      .from(bankAccountCategoryMappings)
      .where(
        and(
          eq(bankAccountCategoryMappings.tenantId, tenantId),
          eq(bankAccountCategoryMappings.appId, appId),
          sql`${bankAccountCategoryMappings.archivedAt} IS NULL`
        )
      );

    return accounts.map((acc) => ({
      ...acc,
      categoryTypes: mappings
        .filter((m) => m.bankAccountId === acc.id)
        .map((m) => m.categoryType),
    }));
  };
}

/**
 * Creates a new bank account within the tenant scope.
 */
export function createBankAccountHandler(db: DbOrTx) {
  return async (
    input: z.infer<typeof CreateBankAccountCommand>,
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    if (input.isPrivate) {
      await ensurePremiumAccess(db, tenantId, "Private personal bank accounts");
    }

    const [bankAccount] = await db
      .insert(bankAccounts)
      .values({
        tenantId: tenantId,
        name: input.name,
        bankProvider: input.bankProvider ?? "CBA",
        lastKnownBalance: input.lastKnownBalance,
        unbudgetedBuffer: input.unbudgetedBuffer,
        isPrivate: input.isPrivate ?? false,
        userId: input.isPrivate ? userId : null,
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
export function updateBankAccountHandler(db: DbOrTx) {
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
 * Re-assigns category types to bank accounts for a tenant.
 */
export function updateBankAccountMappingsHandler(db: DbOrTx) {
  return async (
    input: z.infer<typeof UpdateBankAccountMappingsSchema>,
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    for (const mapping of input.mappings) {
      const [existing] = await db
        .select()
        .from(bankAccountCategoryMappings)
        .where(
          and(
            eq(bankAccountCategoryMappings.tenantId, tenantId),
            eq(bankAccountCategoryMappings.categoryType, mapping.categoryType)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(bankAccountCategoryMappings)
          .set({
            bankAccountId: mapping.bankAccountId,
            updatedAt: new Date(),
            updatedBy: userId,
          })
          .where(eq(bankAccountCategoryMappings.id, existing.id));
      } else {
        await db.insert(bankAccountCategoryMappings).values({
          tenantId,
          appId,
          categoryType: mapping.categoryType,
          bankAccountId: mapping.bankAccountId,
          createdBy: userId,
          updatedBy: userId,
        });
      }
    }

    return { success: true };
  };
}

/**
 * Archives a bank account within the tenant scope after ensuring no category types are linked to it.
 */
export function archiveBankAccountHandler(db: DbOrTx) {
  return async (
    accountId: string,
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    const activeMappings = await db
      .select()
      .from(bankAccountCategoryMappings)
      .where(
        and(
          eq(bankAccountCategoryMappings.tenantId, tenantId),
          eq(bankAccountCategoryMappings.bankAccountId, accountId),
          sql`${bankAccountCategoryMappings.archivedAt} IS NULL`
        )
      );

    if (activeMappings.length > 0) {
      const linkedTypes = activeMappings.map((m) => m.categoryType).join(", ");
      throw new Error(
        `Cannot delete bank account because category type(s) [${linkedTypes}] are linked to it. Please re-assign them to another bank account first.`
      );
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
