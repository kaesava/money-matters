import { db, categories, incomeSources, expenseSources, bankAccounts } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";

export async function listArchivedItemsQuery(
  tenantId: string,
  appId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  const [archivedCats, archivedIncome, archivedExpenses, archivedAccounts] = await Promise.all([
    dbClient
      .select({
        id: categories.id,
        name: categories.name,
        itemType: sql<string>`'CATEGORY'`,
        subtitle: categories.type,
        archivedAt: categories.archivedAt,
      })
      .from(categories)
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
      })
      .from(incomeSources)
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
      })
      .from(expenseSources)
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

  return [...archivedCats, ...archivedIncome, ...archivedExpenses, ...archivedAccounts].sort(
    (a, b) => new Date(b.archivedAt!).getTime() - new Date(a.archivedAt!).getTime()
  );
}
