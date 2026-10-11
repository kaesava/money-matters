import { envelopes, incomeSources, bankAccounts, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";

export async function listArchivedItemsQuery(
  tenantId: string,
  appId: string,
  dbClient: DbOrTx,
  userId?: string
) {
  const [archivedEnvelopes, archivedIncome, archivedAccounts] = await Promise.all([
    dbClient
      .select({
        id: envelopes.id,
        name: envelopes.name,
        itemType: sql<string>`'ENVELOPE'`,
        subtitle: envelopes.envelopeType,
        archivedAt: envelopes.archivedAt,
        isPrivate: envelopes.isPrivate,
        userId: envelopes.userId,
        bankAccountIsPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(envelopes)
      .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
      .where(
        and(
          eq(envelopes.tenantId, tenantId),
          eq(envelopes.appId, appId),
          sql`${envelopes.archivedAt} IS NOT NULL`
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
        userId: sql<string | null>`NULL`,
        bankAccountIsPrivate: bankAccounts.isPrivate,
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
        id: bankAccounts.id,
        name: bankAccounts.name,
        itemType: sql<string>`'BANK_ACCOUNT'`,
        subtitle: bankAccounts.lastKnownBalance,
        archivedAt: bankAccounts.archivedAt,
        isPrivate: bankAccounts.isPrivate,
        userId: bankAccounts.userId,
        bankAccountIsPrivate: bankAccounts.isPrivate,
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

  const filterVisible = <T extends { isPrivate?: boolean | null; userId?: string | null; bankAccountUserId?: string | null }>(items: T[]): T[] => {
    if (!userId) return items;
    return items.filter((item) => !item.isPrivate || (item.userId ? item.userId === userId : item.bankAccountUserId === userId));
  };

  const allVisible = [
    ...filterVisible(archivedEnvelopes),
    ...filterVisible(archivedIncome),
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
