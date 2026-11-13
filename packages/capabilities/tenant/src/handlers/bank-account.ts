import { z } from "zod";
import { bankAccounts, envelopes, expenseEvents, incomeEvents, incomeSources, DbOrTx } from "@money-matters/db";
import { CreateBankAccountCommand, UpdateBankAccountCommand } from "@money-matters/types";
import { eq, and, sql, or, inArray } from "drizzle-orm";
import { ensurePremiumAccess } from "@money-matters/core";

/**
 * Lists bank accounts for a tenant alongside their associated envelopes, respecting private bank account ownership.
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
      .from(envelopes)
      .where(
        and(
          eq(envelopes.tenantId, tenantId),
          eq(envelopes.appId, appId),
          sql`${envelopes.archivedAt} IS NULL`
        )
      );

    const visibleTenantPools = tenantPools.filter((p) => {
      if (userId && p.isPrivate && p.userId !== userId) return false;
      return true;
    });

    return accounts.map((acc) => {
      const linkedPools = visibleTenantPools.filter((p) => p.bankAccountId === acc.id);
      return {
        ...acc,
        envelopes: linkedPools,
        poolTypes: Array.from(new Set(linkedPools.map((p) => p.envelopeType))),
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
        bankProvider: input.bankProvider ?? "Other",
        accountType: input.accountType ?? "EVERYDAY",
        lastKnownBalance: input.lastKnownBalance,
        unbudgetedBuffer: input.unbudgetedBuffer,
        isPrivate: input.isPrivate ?? false,
        userId: input.isPrivate ? userId : null,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    // Auto-seed a single "Personal Spending" Everyday envelope when a user creates their first Private Bank Account
    if (input.isPrivate) {
      const existingPrivateEveryday = await db
        .select({ id: envelopes.id })
        .from(envelopes)
        .where(
          and(
            eq(envelopes.tenantId, tenantId),
            eq(envelopes.appId, appId),
            eq(envelopes.isPrivate, true),
            eq(envelopes.userId, userId),
            eq(envelopes.envelopeType, "EVERYDAY"),
            sql`${envelopes.archivedAt} IS NULL`
          )
        )
        .limit(1);

      if (existingPrivateEveryday.length === 0) {
        await db.insert(envelopes).values({
          tenantId,
          appId,
          bankAccountId: bankAccount.id,
          name: "Personal Spending",
          envelopeType: "EVERYDAY",
          monthlyAmount: "0.00",
          isPrivate: true,
          userId,
          orderIndex: 0,
          createdBy: userId,
          updatedBy: userId,
        });
      }
    }

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

    if (existing.isPrivate && existing.userId !== userId) {
      throw new Error("Bank account not found or access unauthorized.");
    }

    const effectiveBalance = Number(input.lastKnownBalance ?? existing.lastKnownBalance ?? "0");
    const effectiveBuffer = Number(input.unbudgetedBuffer ?? existing.unbudgetedBuffer ?? "0");

    if (effectiveBuffer > effectiveBalance) {
      throw new Error("Safety cushion cannot exceed the current balance.");
    }

    if (input.isPrivate !== undefined && input.isPrivate !== existing.isPrivate) {
      throw new Error("Account privacy cannot be modified after creation.");
    }

    const [updated] = await db
      .update(bankAccounts)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.bankProvider !== undefined ? { bankProvider: input.bankProvider } : {}),
        ...(input.accountType !== undefined ? { accountType: input.accountType } : {}),
        ...(input.lastKnownBalance !== undefined ? { lastKnownBalance: input.lastKnownBalance } : {}),
        ...(input.unbudgetedBuffer !== undefined ? { unbudgetedBuffer: input.unbudgetedBuffer } : {}),
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
 * Archives a bank account within the tenant scope after ensuring no Everyday or Surplus Target envelopes are linked.
 * Cascades archival to non-special linked envelopes and income sources at timestamp T.
 */
export function archiveBankAccountHandler(db: DbOrTx) {
  return async (
    accountId: string,
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    const [existing] = await db
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

    if (!existing) {
      throw new Error("Bank account not found or access unauthorized.");
    }

    if (existing.isPrivate && existing.userId !== userId) {
      throw new Error("Bank account not found or access unauthorized.");
    }

    const activePools = await db
      .select()
      .from(envelopes)
      .where(
        and(
          eq(envelopes.tenantId, tenantId),
          eq(envelopes.bankAccountId, accountId),
          sql`${envelopes.archivedAt} IS NULL`
        )
      );

    if (activePools.some((p) => p.envelopeType === "EVERYDAY")) {
      throw new Error(
        "Cannot archive bank account linked to the Everyday envelope. Please re-assign the Everyday envelope to another bank account first."
      );
    }

    if (activePools.some((p) => p.isSurplusTarget)) {
      throw new Error(
        "Cannot archive bank account linked to the active Surplus Sweep Target. Please designate another Surplus Sweep Target or re-assign it to another bank account first."
      );
    }

    const archiveTimestamp = new Date();

    // 1. Archive the bank account
    const [archived] = await db
      .update(bankAccounts)
      .set({
        archivedAt: archiveTimestamp,
        archivedBy: userId,
        updatedBy: userId,
        updatedAt: archiveTimestamp,
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

    // 2. Cascade archive linked envelopes and their pending expense events
    const poolIds = activePools.map((p) => p.id);
    if (poolIds.length > 0) {
      await db
        .update(envelopes)
        .set({
          archivedAt: archiveTimestamp,
          archivedBy: userId,
          updatedBy: userId,
          updatedAt: archiveTimestamp,
        })
        .where(
          and(
            eq(envelopes.tenantId, tenantId),
            eq(envelopes.appId, appId),
            eq(envelopes.bankAccountId, accountId),
            sql`${envelopes.archivedAt} IS NULL`
          )
        );

      await db
        .delete(expenseEvents)
        .where(
          and(
            inArray(expenseEvents.envelopeId, poolIds),
            eq(expenseEvents.status, "PENDING"),
            eq(expenseEvents.tenantId, tenantId),
            eq(expenseEvents.appId, appId)
          )
        );
    }

    // 3. Cascade archive linked income sources and delete their pending income events
    const linkedIncomes = await db
      .select({ id: incomeSources.id })
      .from(incomeSources)
      .where(
        and(
          eq(incomeSources.tenantId, tenantId),
          eq(incomeSources.appId, appId),
          eq(incomeSources.receivingAccountId, accountId),
          sql`${incomeSources.archivedAt} IS NULL`
        )
      );

    const incomeIds = linkedIncomes.map((i) => i.id);
    if (incomeIds.length > 0) {
      await db
        .update(incomeSources)
        .set({
          archivedAt: archiveTimestamp,
          archivedBy: userId,
          updatedBy: userId,
          updatedAt: archiveTimestamp,
        })
        .where(
          and(
            eq(incomeSources.tenantId, tenantId),
            eq(incomeSources.appId, appId),
            eq(incomeSources.receivingAccountId, accountId),
            sql`${incomeSources.archivedAt} IS NULL`
          )
        );

      await db
        .delete(incomeEvents)
        .where(
          and(
            inArray(incomeEvents.incomeSourceId, incomeIds),
            eq(incomeEvents.status, "PENDING"),
            eq(incomeEvents.tenantId, tenantId),
            eq(incomeEvents.appId, appId)
          )
        );
    }

    if (existing.isPrivate) {
      const activePrivate = await db
        .select({ id: envelopes.id })
        .from(envelopes)
        .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
        .where(
          and(
            eq(envelopes.tenantId, tenantId),
            eq(envelopes.appId, appId),
            sql`${envelopes.archivedAt} IS NULL`,
            or(
              and(eq(envelopes.isPrivate, true), eq(envelopes.userId, userId)),
              and(eq(bankAccounts.isPrivate, true), eq(bankAccounts.userId, userId))
            )
          )
        );

      if (activePrivate.length === 0) {
        await db
          .update(incomeSources)
          .set({ contributionMode: "FULL", contributionValue: null, updatedAt: new Date(), updatedBy: userId })
          .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId), sql`${incomeSources.archivedAt} IS NULL`));

        await db
          .update(incomeEvents)
          .set({ contributionMode: "FULL", contributionValue: null, updatedAt: new Date(), updatedBy: userId })
          .where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId), sql`${incomeEvents.status} != 'CONFIRMED'`, sql`${incomeEvents.archivedAt} IS NULL`));
      }
    }

    return { success: true };
  };
}
