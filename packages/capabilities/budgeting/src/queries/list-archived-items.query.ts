import { pools, categories, incomeSources, expenseSources, bankAccounts, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";

export async function listArchivedItemsQuery(
  tenantId: string,
  appId: string,
  dbClient: DbOrTx,
  userId?: string
) {
  const [archivedPools, archivedCats, archivedIncome, archivedExpenses, archivedAccounts] = await Promise.all([
    dbClient
      .select({
        id: pools.id,
        name: pools.name,
        itemType: sql<string>`'POOL'`,
        subtitle: pools.poolType,
        archivedAt: pools.archivedAt,
        isPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(pools)
      .leftJoin(bankAccounts, eq(pools.bankAccountId, bankAccounts.id))
      .where(
        and(
          eq(pools.tenantId, tenantId),
          eq(pools.appId, appId),
          sql`${pools.archivedAt} IS NOT NULL`
        )
      ),
    dbClient
      .select({
        id: categories.id,
        name: categories.name,
        itemType: sql<string>`'CATEGORY'`,
        subtitle: categories.monthlyAmount,
        archivedAt: categories.archivedAt,
        isPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(categories)
      .innerJoin(pools, eq(categories.poolId, pools.id))
      .leftJoin(bankAccounts, eq(pools.bankAccountId, bankAccounts.id))
      .where(
        and(
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId),
          sql`${categories.archivedAt} IS NOT NULL`
        )
      ),
    dbClient
      .select({
        id: incomeSources.id,
        name: incomeSources.name,
        itemType: sql<string>`'INCOME_SOURCE'`,
        subtitle: incomeSources.amount,
        archivedAt: incomeSources.archivedAt,
        isPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(incomeSources)
      .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
      .where(
        and(
          eq(incomeSources.tenantId, tenantId),
          eq(incomeSources.appId, appId),
          sql`${incomeSources.archivedAt} IS NOT NULL`
        )
      ),
    dbClient
      .select({
        id: expenseSources.id,
        name: expenseSources.name,
        itemType: sql<string>`'EXPENSE_SOURCE'`,
        subtitle: expenseSources.amount,
        archivedAt: expenseSources.archivedAt,
        isPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(expenseSources)
      .innerJoin(pools, eq(expenseSources.poolId, pools.id))
      .leftJoin(bankAccounts, eq(pools.bankAccountId, bankAccounts.id))
      .where(
        and(
          eq(expenseSources.tenantId, tenantId),
          eq(expenseSources.appId, appId),
          sql`${expenseSources.archivedAt} IS NOT NULL`
        )
      ),
    dbClient
      .select({
        id: bankAccounts.id,
        name: bankAccounts.name,
        itemType: sql<string>`'BANK_ACCOUNT'`,
        subtitle: bankAccounts.lastKnownBalance,
        archivedAt: bankAccounts.archivedAt,
        isPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId),
          sql`${bankAccounts.archivedAt} IS NOT NULL`
        )
      ),
  ]);

  const filterVisible = <T extends { isPrivate?: boolean | null; bankAccountUserId?: string | null }>(items: T[]): T[] => {
    if (!userId) return items;
    return items.filter((item) => !item.isPrivate || item.bankAccountUserId === userId);
  };

  const allVisible = [
    ...filterVisible(archivedPools),
    ...filterVisible(archivedCats),
    ...filterVisible(archivedIncome),
    ...filterVisible(archivedExpenses),
    ...filterVisible(archivedAccounts),
  ].map(({ id, name, itemType, subtitle, archivedAt }) => ({
    id,
    name,
    itemType,
    subtitle,
    archivedAt,
  }));

  return allVisible.sort(
    (a, b) => new Date(b.archivedAt!).getTime() - new Date(a.archivedAt!).getTime()
  );
}
