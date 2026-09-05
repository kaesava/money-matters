import { z } from "zod";
import { bankAccounts, pools, incomeEvents, incomeSources, DbOrTx } from "@money-matters/db";
import { CreateBankAccountCommand, UpdateBankAccountCommand } from "@money-matters/types";
import { eq, and, sql, or } from "drizzle-orm";
import { ensurePremiumAccess } from "@money-matters/core";

/**
 * Lists bank accounts for a tenant alongside their associated pools, respecting private bank account ownership.
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

    const tenantPools = await db
      .select()
      .from(pools)
      .where(
        and(
          eq(pools.tenantId, tenantId),
          eq(pools.appId, appId),
          sql`${pools.archivedAt} IS NULL`
        )
      );

    return accounts.map((acc) => {
      const linkedPools = tenantPools.filter((p) => p.bankAccountId === acc.id);
      return {
        ...acc,
        pools: linkedPools,
        poolTypes: Array.from(new Set(linkedPools.map((p) => p.poolType))),
      };
    });
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
    const existingList = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.id, accountId),
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId),
          sql`${bankAccounts.archivedAt} IS NULL`
        )
      )
      .limit(1);

    const existing = existingList[0];
    if (!existing) {
      throw new Error("Bank account not found or access unauthorized.");
    }

    const effectiveBalance = Number(input.lastKnownBalance ?? existing.lastKnownBalance ?? "0");
    const effectiveBuffer = Number(input.unbudgetedBuffer ?? existing.unbudgetedBuffer ?? "0");

    if (effectiveBuffer > effectiveBalance) {
      throw new Error("Unbudgeted buffer cannot exceed the current balance.");
    }

    const [updated] = await db
      .update(bankAccounts)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.bankProvider !== undefined ? { bankProvider: input.bankProvider } : {}),
        ...(input.lastKnownBalance !== undefined ? { lastKnownBalance: input.lastKnownBalance } : {}),
        ...(input.unbudgetedBuffer !== undefined ? { unbudgetedBuffer: input.unbudgetedBuffer } : {}),
        ...(input.isPrivate !== undefined
          ? {
              isPrivate: input.isPrivate,
              userId: input.isPrivate ? userId : null,
            }
          : {}),
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
 * Archives a bank account within the tenant scope after ensuring no active pools are linked to it.
 */
export function archiveBankAccountHandler(db: DbOrTx) {
  return async (
    accountId: string,
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    const activePools = await db
      .select()
      .from(pools)
      .where(
        and(
          eq(pools.tenantId, tenantId),
          eq(pools.bankAccountId, accountId),
          sql`${pools.archivedAt} IS NULL`
        )
      );

    if (activePools.length > 0) {
      const linkedNames = activePools.map((p) => p.name).join(", ");
      throw new Error(
        `Cannot archive bank account because pool(s) [${linkedNames}] are linked to it. Please re-assign them to another bank account first.`
      );
    }

    const pendingIncomes = await db
      .select({ id: incomeEvents.id })
      .from(incomeEvents)
      .leftJoin(incomeSources, eq(incomeSources.id, incomeEvents.incomeSourceId))
      .where(
        and(
          eq(incomeSources.receivingAccountId, accountId),
          sql`${incomeEvents.status} IN ('PENDING', 'PENDING')`,
          sql`${incomeEvents.archivedAt} IS NULL`
        )
      );

    if (pendingIncomes.length > 0) {
      throw new Error(
        "Cannot archive bank account because there are upcoming or pending income records assigned to it."
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
