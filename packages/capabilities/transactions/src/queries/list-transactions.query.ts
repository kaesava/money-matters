import { transactionLedger, categories, DbOrTx } from "@money-matters/db";
import { eq, and, sql, desc } from "drizzle-orm";

export async function listTransactionsQuery(
  tenantId: string,
  appId: string,
  limit = 50,
  offset = 0,
  dbClient: DbOrTx,
  categoryId?: string
) {
  const conditions = [
    eq(transactionLedger.tenantId, tenantId),
    eq(transactionLedger.appId, appId),
    sql`${transactionLedger.archivedAt} IS NULL`,
  ];

  if (categoryId) {
    conditions.push(eq(transactionLedger.categoryId, categoryId));
  }

  return await dbClient
    .select({
      id: transactionLedger.id,
      categoryId: transactionLedger.categoryId,
      bankAccountId: transactionLedger.bankAccountId,
      planLineId: transactionLedger.planLineId,
      transferGroupId: transactionLedger.transferGroupId,
      flowType: transactionLedger.flowType,
      amount: transactionLedger.amount,
      note: transactionLedger.note,
      source: transactionLedger.source,
      recordedAt: transactionLedger.recordedAt,
      categoryName: categories.name,
    })
    .from(transactionLedger)
    .leftJoin(categories, eq(transactionLedger.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(transactionLedger.recordedAt))
    .limit(limit)
    .offset(offset);
}

export async function listCategoryTransactionsQuery(
  categoryId: string,
  tenantId: string,
  appId: string,
  limit = 30,
  offset = 0,
  dbClient: DbOrTx
) {
  return await dbClient
    .select({
      id: transactionLedger.id,
      categoryId: transactionLedger.categoryId,
      bankAccountId: transactionLedger.bankAccountId,
      planLineId: transactionLedger.planLineId,
      flowType: transactionLedger.flowType,
      amount: transactionLedger.amount,
      note: transactionLedger.note,
      source: transactionLedger.source,
      recordedAt: transactionLedger.recordedAt,
      categoryName: categories.name,
    })
    .from(transactionLedger)
    .leftJoin(categories, eq(transactionLedger.categoryId, categories.id))
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        eq(transactionLedger.categoryId, categoryId),
        sql`${transactionLedger.archivedAt} IS NULL`
      )
    )
    .orderBy(desc(transactionLedger.recordedAt))
    .limit(limit)
    .offset(offset);
}
