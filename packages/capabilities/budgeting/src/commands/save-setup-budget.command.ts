import {
  DbOrTx,
  pools,
  categories,
  bankAccounts,
  incomeSources,
  transactionLedger,
  tenants,
  getPoolBalancesMap,
} from "@money-matters/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { SaveSetupBudgetCommand } from "@money-matters/types";
import { randomUUID } from "crypto";

export interface SaveSetupBudgetResult {
  success: boolean;
  persistedCounts: {
    incomes: number;
    bankAccounts: number;
    pools: number;
    categories: number;
    sweptPools: number;
    sweptTotalAmount: number;
  };
}

export function saveSetupBudgetHandler(dbClient: DbOrTx) {
  return async (
    input: z.infer<typeof SaveSetupBudgetCommand>,
    appId: string,
    userId: string,
    tenantId: string
  ): Promise<SaveSetupBudgetResult> => {
    // Guard against mock DBs in Vitest without .transaction method
    const runInTx =
      typeof dbClient.transaction === "function"
        ? (cb: (tx: DbOrTx) => Promise<SaveSetupBudgetResult>) => dbClient.transaction(cb)
        : (cb: (tx: DbOrTx) => Promise<SaveSetupBudgetResult>) => cb(dbClient);

    return await runInTx(async (tx) => {
      const now = new Date();

      // =========================================================================
      // 1. Process Bank Accounts
      // =========================================================================
      const existingAccounts = await tx
        .select()
        .from(bankAccounts)
        .where(
          and(
            eq(bankAccounts.tenantId, tenantId),
            eq(bankAccounts.appId, appId),
            sql`${bankAccounts.archivedAt} IS NULL`
          )
        );

      const accountIdMap = new Map<string, string>(); // input.id or client-temp-id -> real DB UUID

      for (let i = 0; i < input.bankAccounts.length; i++) {
        const accInput = input.bankAccounts[i];
        const matchedExisting = accInput.id
          ? existingAccounts.find((a) => a.id === accInput.id)
          : null;

        if (matchedExisting) {
          // Update existing account
          await tx
            .update(bankAccounts)
            .set({
              name: accInput.name,
              bankProvider: accInput.bankProvider || matchedExisting.bankProvider,
              lastKnownBalance: accInput.lastKnownBalance || matchedExisting.lastKnownBalance,
              unbudgetedBuffer: accInput.unbudgetedBuffer || matchedExisting.unbudgetedBuffer,
              isPrivate: accInput.isPrivate ?? matchedExisting.isPrivate,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(eq(bankAccounts.id, matchedExisting.id));

          if (accInput.id) accountIdMap.set(accInput.id, matchedExisting.id);
          accountIdMap.set(`idx-${i}`, matchedExisting.id);
        } else {
          // Insert new account
          const newAccountId = randomUUID();
          await tx.insert(bankAccounts).values({
            id: newAccountId,
            tenantId,
            appId,
            name: accInput.name,
            bankProvider: accInput.bankProvider || "CBA",
            lastKnownBalance: accInput.lastKnownBalance || "0.00",
            unbudgetedBuffer: accInput.unbudgetedBuffer || "0.00",
            isPrivate: accInput.isPrivate ?? false,
            createdAt: now,
            createdBy: userId,
            updatedAt: now,
            updatedBy: userId,
          });

          if (accInput.id) accountIdMap.set(accInput.id, newAccountId);
          accountIdMap.set(`idx-${i}`, newAccountId);
        }
      }

      // Default fallback account ID (first available account)
      const primaryBankAccountId =
        accountIdMap.get(input.bankAccounts[0]?.id || "") ||
        accountIdMap.get("idx-0") ||
        existingAccounts[0]?.id ||
        "";

      // =========================================================================
      // 2. Fetch Active Pools & Handle Archivals / Balance Sweeps
      // =========================================================================
      const existingPools = await tx
        .select()
        .from(pools)
        .where(
          and(
            eq(pools.tenantId, tenantId),
            eq(pools.appId, appId),
            sql`${pools.archivedAt} IS NULL`
          )
        );

      // Validate: Everyday pool cannot be deleted/archived
      for (const arch of input.archivedPools) {
        const targetPool = existingPools.find((p) => p.id === arch.poolId);
        if (targetPool && targetPool.poolType === "EVERYDAY") {
          throw new Error("The default Everyday pool cannot be deleted or archived.");
        }
      }

      // Compute current balances for pools to detect any funds that must be swept
      const poolBalancesMap = await getPoolBalancesMap(tenantId, appId, tx);

      let sweptPoolsCount = 0;
      let sweptTotalAmount = 0;

      for (const arch of input.archivedPools) {
        const poolToArchive = existingPools.find((p) => p.id === arch.poolId);
        if (!poolToArchive) continue;

        const currentBalance = poolBalancesMap[arch.poolId] || 0;

        // If pool holds real positive balance, require and execute sweep to destination pool
        if (currentBalance > 0.005) {
          const destPoolId =
            arch.sweepDestinationPoolId ||
            input.pools.find((p) => p.isSurplusTarget)?.id ||
            existingPools.find((p) => p.isSurplusTarget && p.id !== arch.poolId)?.id;

          if (!destPoolId) {
            throw new Error(
              `Cannot remove pool "${poolToArchive.name}" with positive balance of $${currentBalance.toFixed(
                2
              )} without specifying a valid destination pool for the funds sweep.`
            );
          }

          // Generate balanced transfer ledger records
          const transferNote = `Balance sweep upon archiving pool "${poolToArchive.name}"`;
          const sweepAmountStr = currentBalance.toFixed(2);
          const transferGroupId = randomUUID();

          await tx.insert(transactionLedger).values([
            {
              id: randomUUID(),
              tenantId,
              appId,
              poolId: arch.poolId,
              bankAccountId: poolToArchive.bankAccountId,
              amount: sweepAmountStr,
              flowType: "DEBIT",
              transactionType: "TRANSFER_OUT",
              idempotencyKey: `sweep-out-${arch.poolId}-${randomUUID()}`,
              note: transferNote,
              source: "MANUAL",
              transferGroupId,
              recordedAt: now,
              createdAt: now,
              createdBy: userId,
              updatedAt: now,
              updatedBy: userId,
            },
            {
              id: randomUUID(),
              tenantId,
              appId,
              poolId: destPoolId,
              bankAccountId: poolToArchive.bankAccountId,
              amount: sweepAmountStr,
              flowType: "CREDIT",
              transactionType: "TRANSFER_IN",
              idempotencyKey: `sweep-in-${destPoolId}-${randomUUID()}`,
              note: transferNote,
              source: "MANUAL",
              transferGroupId,
              recordedAt: now,
              createdAt: now,
              createdBy: userId,
              updatedAt: now,
              updatedBy: userId,
            },
          ]);

          sweptPoolsCount++;
          sweptTotalAmount += currentBalance;
        }

        // Soft-archive the pool
        await tx
          .update(pools)
          .set({
            archivedAt: now,
            archivedBy: userId,
            updatedAt: now,
            updatedBy: userId,
          })
          .where(eq(pools.id, arch.poolId));
      }

      // =========================================================================
      // 3. Upsert Active Pools
      // =========================================================================
      const poolIdMap = new Map<string, string>(); // input.id -> real DB UUID

      for (let i = 0; i < input.pools.length; i++) {
        const poolInput = input.pools[i];
        const matchedExisting = poolInput.id
          ? existingPools.find((p) => p.id === poolInput.id && !input.archivedPools.some((a) => a.poolId === p.id))
          : null;

        // Resolve linked bank account
        const resolvedBankAccountId =
          (poolInput.bankAccountId && accountIdMap.get(poolInput.bankAccountId)) ||
          poolInput.bankAccountId ||
          primaryBankAccountId;

        if (matchedExisting) {
          // In-place update
          await tx
            .update(pools)
            .set({
              name: poolInput.name,
              targetAmount: poolInput.targetAmount,
              targetDate: poolInput.targetDate,
              everydayAllowanceAmount: poolInput.everydayAllowanceAmount,
              isSurplusTarget: poolInput.isSurplusTarget ?? matchedExisting.isSurplusTarget,
              isCommitted: poolInput.isCommitted ?? matchedExisting.isCommitted,
              bankAccountId: resolvedBankAccountId || matchedExisting.bankAccountId,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(eq(pools.id, matchedExisting.id));

          if (poolInput.id) poolIdMap.set(poolInput.id, matchedExisting.id);
          poolIdMap.set(`type-${poolInput.poolType}`, matchedExisting.id);
        } else {
          // Insert new pool
          const newPoolId = randomUUID();
          await tx.insert(pools).values({
            id: newPoolId,
            tenantId,
            appId,
            bankAccountId: resolvedBankAccountId,
            name: poolInput.name,
            poolType: poolInput.poolType,
            targetAmount: poolInput.targetAmount || null,
            targetDate: poolInput.targetDate || null,
            everydayAllowanceAmount: poolInput.everydayAllowanceAmount || null,
            isSurplusTarget: poolInput.isSurplusTarget ?? false,
            isCommitted: poolInput.isCommitted ?? false,
            createdAt: now,
            createdBy: userId,
            updatedAt: now,
            updatedBy: userId,
          });

          if (poolInput.id) poolIdMap.set(poolInput.id, newPoolId);
          poolIdMap.set(`type-${poolInput.poolType}`, newPoolId);
        }
      }

      // Default pool fallback maps
      const defaultEverydayPoolId = poolIdMap.get("type-EVERYDAY") || existingPools.find((p) => p.poolType === "EVERYDAY")?.id || "";
      const defaultRegularPoolId = poolIdMap.get("type-REGULAR") || existingPools.find((p) => p.poolType === "REGULAR")?.id || defaultEverydayPoolId;

      // =========================================================================
      // 4. Handle Category Archivals & Upserts
      // =========================================================================
      if (input.archivedCategoryIds.length > 0) {
        await tx
          .update(categories)
          .set({
            archivedAt: now,
            archivedBy: userId,
            updatedAt: now,
            updatedBy: userId,
          })
          .where(
            and(
              eq(categories.tenantId, tenantId),
              eq(categories.appId, appId),
              inArray(categories.id, input.archivedCategoryIds)
            )
          );
      }

      const existingCategories = await tx
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.tenantId, tenantId),
            eq(categories.appId, appId),
            sql`${categories.archivedAt} IS NULL`
          )
        );

      for (const catInput of input.categories) {
        const matchedCat = catInput.id ? existingCategories.find((c) => c.id === catInput.id) : null;

        // Resolve poolId
        const resolvedPoolId =
          (catInput.poolId && poolIdMap.get(catInput.poolId)) ||
          catInput.poolId ||
          (catInput.poolType === "EVERYDAY" ? defaultEverydayPoolId : defaultRegularPoolId);

        if (matchedCat) {
          // In-place update
          await tx
            .update(categories)
            .set({
              name: catInput.name,
              monthlyAmount: catInput.monthlyAmount || matchedCat.monthlyAmount,
              enteredAmount: catInput.enteredAmount || catInput.monthlyAmount || matchedCat.enteredAmount,
              budgetFrequency: catInput.budgetFrequency || matchedCat.budgetFrequency,
              icon: catInput.icon || matchedCat.icon,
              isEssential: catInput.isEssential ?? matchedCat.isEssential,
              poolId: resolvedPoolId || matchedCat.poolId,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(eq(categories.id, matchedCat.id));
        } else {
          // Insert new category
          await tx.insert(categories).values({
            id: randomUUID(),
            tenantId,
            appId,
            poolId: resolvedPoolId,
            name: catInput.name,
            icon: catInput.icon || "wallet",
            monthlyAmount: catInput.monthlyAmount || "0.00",
            enteredAmount: catInput.enteredAmount || catInput.monthlyAmount || "0.00",
            budgetFrequency: catInput.budgetFrequency || "MONTHLY",
            isEssential: catInput.isEssential ?? false,
            createdAt: now,
            createdBy: userId,
            updatedAt: now,
            updatedBy: userId,
          });
        }
      }

      // =========================================================================
      // 5. Upsert Income Schedules
      // =========================================================================
      const existingIncomes = await tx
        .select()
        .from(incomeSources)
        .where(
          and(
            eq(incomeSources.tenantId, tenantId),
            eq(incomeSources.appId, appId),
            sql`${incomeSources.archivedAt} IS NULL`
          )
        );

      for (const incInput of input.incomes) {
        const matchedIncome = incInput.id ? existingIncomes.find((inc) => inc.id === incInput.id) : null;

        const resolvedRecvAccount =
          (incInput.receivingAccountId && accountIdMap.get(incInput.receivingAccountId)) ||
          incInput.receivingAccountId ||
          primaryBankAccountId;

        // Format RRULE
        let rrule = "FREQ=MONTHLY";
        if (incInput.frequency === "WEEKLY") rrule = "FREQ=WEEKLY";
        else if (incInput.frequency === "FORTNIGHTLY") rrule = "FREQ=WEEKLY;INTERVAL=2";
        else if (incInput.frequency === "CUSTOM") rrule = "FREQ=MONTHLY";

        if (matchedIncome) {
          // In-place update
          await tx
            .update(incomeSources)
            .set({
              name: incInput.name,
              amount: incInput.amount,
              receivingAccountId: resolvedRecvAccount || matchedIncome.receivingAccountId,
              rrule,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(eq(incomeSources.id, matchedIncome.id));
        } else {
          // Insert new income source
          await tx.insert(incomeSources).values({
            id: randomUUID(),
            tenantId,
            appId,
            name: incInput.name,
            amount: incInput.amount,
            receivingAccountId: resolvedRecvAccount || null,
            rrule,
            startDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(now),
            createdAt: now,
            createdBy: userId,
            updatedAt: now,
            updatedBy: userId,
          });
        }
      }

      // =========================================================================
      // 6. Update Tenant Setup Status and Setup Timestamp (Household Level)
      // =========================================================================
      if (typeof (tx as any).update === "function") {
        await tx
          .update(tenants)
          .set({
            setupCompletedAt: now,
            setupStatus: "COMPLETED",
            updatedAt: now,
            updatedBy: userId,
          })
          .where(eq(tenants.id, tenantId));
      }

      return {
        success: true,
        persistedCounts: {
          incomes: input.incomes.length,
          bankAccounts: input.bankAccounts.length,
          pools: input.pools.length,
          categories: input.categories.length,
          sweptPools: sweptPoolsCount,
          sweptTotalAmount,
        },
      };
    });
  };
}
