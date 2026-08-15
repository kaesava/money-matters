import { categories, expenseEvents, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";

export async function archiveCategoryCommand(
  categoryId: string,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  // 1. Fetch category
  const [cat] = await dbClient
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.tenantId, tenantId),
        eq(categories.appId, appId)
      )
    );

  if (!cat) throw new Error("Category not found.");
  if (cat.type === "EVERYDAY") {
    throw new Error("The default Everyday category cannot be deleted or archived.");
  }

  // 2. Check for upcoming expense events
  const pendingEvents = await dbClient
    .select()
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.categoryId, categoryId),
        eq(expenseEvents.status, "UPCOMING"),
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );

  if (pendingEvents.length > 0) {
    throw new Error("Cannot archive a category that has upcoming expenses assigned to it.");
  }

  const [archived] = await dbClient
    .update(categories)
    .set({
      archivedAt: new Date(),
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.tenantId, tenantId),
        eq(categories.appId, appId)
      )
    )
    .returning();

  return archived;
}
