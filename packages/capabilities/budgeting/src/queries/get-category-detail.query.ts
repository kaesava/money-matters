import { db, categories, transactionLedger } from "@money-matters/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";

export async function getCategoryDetailQuery(
  categoryId: string,
  tenantId: string,
  appId: string,
  limit = 30,
  offset = 0,
  dbClient: PgDatabase<any, any, any> = db
) {
  const [category] = await dbClient
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.tenantId, tenantId),
        eq(categories.appId, appId),
        sql`${categories.archivedAt} IS NULL`
      )
    );

  if (!category) {
    throw new Error("Category not found.");
  }

  const txs = await dbClient
    .select()
    .from(transactionLedger)
    .where(
      and(
        eq(transactionLedger.categoryId, categoryId),
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        sql`${transactionLedger.archivedAt} IS NULL`
      )
    )
    .orderBy(desc(transactionLedger.recordedAt))
    .limit(limit)
    .offset(offset);

  return {
    category,
    transactions: txs,
  };
}
