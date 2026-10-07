import { pools, categories, incomeSources, expenseSources, incomeEvents, expenseEvents, bankAccounts, tenants, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { generateBurstDates } from "../engine/burst-engine.js";

import { getTenantDateString } from "@money-matters/core";

export async function restoreItemCommand(
  itemId: string,
  itemType: "POOL" | "CATEGORY" | "INCOME_SOURCE" | "EXPENSE_SOURCE" | "BANK_ACCOUNT",
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  let tenantRecord: { timezone: string | null } | null = null;
  if (typeof (dbClient as any).select === "function") {
    try {
      const q = dbClient.select({ timezone: tenants.timezone }).from(tenants).where(eq(tenants.id, tenantId));
      if (typeof (q as any).limit === "function") {
        const rows = await (q as any).limit(1);
        tenantRecord = rows[0] || null;
      }
    } catch {
      // Mock db or schema mismatch safe fallback
    }
  }
  const tenantTz = tenantRecord?.timezone || "Australia/Sydney";
  const getLocalDateString = (d: Date = new Date()) => getTenantDateString(d, { timezone: tenantTz });
  // 1. Verify existence, stealth privacy, and parent constraints
  let poolArchivedAt: Date | null = null;
  if (itemType === "BANK_ACCOUNT") {
    const [acc] = await dbClient
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, itemId), eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));
    if (!acc) throw new Error("Bank account not found.");
    if (acc.isPrivate && acc.userId !== userId) {
      throw new Error("Access unauthorized or private account.");
    }
  } else if (itemType === "POOL") {
    const [p] = await dbClient
      .select({
        isPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
        archivedAt: pools.archivedAt,
      })
      .from(pools)
      .leftJoin(bankAccounts, eq(pools.bankAccountId, bankAccounts.id))
      .where(and(eq(pools.id, itemId), eq(pools.tenantId, tenantId), eq(pools.appId, appId)));
    if (!p) throw new Error("Pool not found.");
    if (p.isPrivate && p.bankAccountUserId !== userId) {
      throw new Error("Access unauthorized or private pool.");
    }
    poolArchivedAt = p.archivedAt;
  } else if (itemType === "CATEGORY") {
    const [cat] = await dbClient
      .select({
        poolArchivedAt: pools.archivedAt,
        isPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(categories)
      .innerJoin(pools, eq(categories.poolId, pools.id))
      .innerJoin(bankAccounts, eq(pools.bankAccountId, bankAccounts.id))
      .where(and(eq(categories.id, itemId), eq(categories.tenantId, tenantId), eq(categories.appId, appId)));
    if (!cat) throw new Error("Category not found.");
    if (cat.poolArchivedAt !== null) {
      throw new Error("Cannot restore category because its parent pool is archived. Restore the pool first.");
    }
    if (cat.isPrivate && cat.bankAccountUserId !== userId) {
      throw new Error("Access unauthorized or private category.");
    }
  } else if (itemType === "INCOME_SOURCE") {
    const [inc] = await dbClient
      .select({
        isPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(incomeSources)
      .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
      .where(and(eq(incomeSources.id, itemId), eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));
    if (!inc) throw new Error("Income source not found.");
    if (inc.isPrivate && inc.bankAccountUserId !== userId) {
      throw new Error("Access unauthorized or private income source.");
    }
  } else if (itemType === "EXPENSE_SOURCE") {
    const [exp] = await dbClient
      .select({
        isPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(expenseSources)
      .innerJoin(pools, eq(expenseSources.poolId, pools.id))
      .innerJoin(bankAccounts, eq(pools.bankAccountId, bankAccounts.id))
      .where(and(eq(expenseSources.id, itemId), eq(expenseSources.tenantId, tenantId), eq(expenseSources.appId, appId)));
    if (!exp) throw new Error("Expense source not found.");
    if (exp.isPrivate && exp.bankAccountUserId !== userId) {
      throw new Error("Access unauthorized or private expense source.");
    }
  }

  let table: typeof pools | typeof categories | typeof incomeSources | typeof expenseSources | typeof bankAccounts = categories;
  if (itemType === "POOL") table = pools;
  if (itemType === "INCOME_SOURCE") table = incomeSources;
  if (itemType === "EXPENSE_SOURCE") table = expenseSources;
  if (itemType === "BANK_ACCOUNT") table = bankAccounts;

  const [restored] = await dbClient
    .update(table)
    .set({
      archivedAt: null,
      archivedBy: null,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(table.id, itemId),
        eq(table.tenantId, tenantId),
        eq(table.appId, appId)
      )
    )
    .returning();

  if (restored && itemType === "POOL") {
    // Cascade restore any child categories archived on or after the pool was archived (allowing 2s lag)
    const poolArchivedTime = (restored as typeof pools.$inferSelect).archivedAt || poolArchivedAt;
    const cutoff = poolArchivedTime
      ? new Date(new Date(poolArchivedTime).getTime() - 2000)
      : new Date(Date.now() - 2000);

    await dbClient
      .update(categories)
      .set({
        archivedAt: null,
        archivedBy: null,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(categories.poolId, itemId),
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId),
          sql`${categories.archivedAt} >= ${cutoff}`
        )
      );
  }

  if (restored) {
    if (itemType === "INCOME_SOURCE") {
      const inc = restored as typeof incomeSources.$inferSelect;
      const startDate = inc.startDate || getLocalDateString();
      if (inc.rrule) {
        const dates = generateBurstDates(inc.rrule, startDate, inc.endDate, 12);
        if (dates.length > 0) {
          await dbClient.insert(incomeEvents).values(
            dates.map((d) => ({
              incomeSourceId: inc.id,
              expectedDate: getLocalDateString(d),
              expectedAmount: inc.amount,
              status: "PENDING" as const,
              tenantId,
              appId,
              createdBy: userId,
              updatedBy: userId,
            }))
          );
        }
      } else {
        await dbClient.insert(incomeEvents).values({
          incomeSourceId: inc.id,
          expectedDate: startDate,
          expectedAmount: inc.amount,
          status: "PENDING",
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        });
      }
    } else if (itemType === "EXPENSE_SOURCE") {
      const exp = restored as typeof expenseSources.$inferSelect;
      const startDate = exp.startDate || getLocalDateString();
      if (exp.rrule) {
        const dates = generateBurstDates(exp.rrule, startDate, exp.endDate, 12);
        if (dates.length > 0) {
          await dbClient.insert(expenseEvents).values(
            dates.map((d) => ({
              expenseSourceId: exp.id,
              poolId: exp.poolId,
              categoryId: exp.categoryId,
              name: exp.name,
              expectedDate: getLocalDateString(d),
              expectedAmount: exp.amount,
              status: "PENDING" as const,
              tenantId,
              appId,
              createdBy: userId,
              updatedBy: userId,
            }))
          );
        }
      } else {
        await dbClient.insert(expenseEvents).values({
          expenseSourceId: exp.id,
          poolId: exp.poolId,
          categoryId: exp.categoryId,
          name: exp.name,
          expectedDate: startDate,
          expectedAmount: exp.amount,
          status: "PENDING",
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        });
      }
    }
  }

  return restored;
}

