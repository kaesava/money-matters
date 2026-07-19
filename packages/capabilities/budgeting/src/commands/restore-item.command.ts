import { db, categories, incomeSources, bankAccounts } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";

export async function restoreItemCommand(
  itemId: string,
  itemType: "CATEGORY" | "INCOME_SOURCE" | "BANK_ACCOUNT",
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  let table: typeof categories | typeof incomeSources | typeof bankAccounts = categories;
  if (itemType === "INCOME_SOURCE") table = incomeSources;
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

  return restored;
}
