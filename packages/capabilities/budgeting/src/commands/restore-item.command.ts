import { categories, incomeSources, expenseSources, incomeEvents, expenseEvents, bankAccounts, DbOrTx } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { generateBurstDates } from "../engine/burst-engine.js";

export async function restoreItemCommand(
  itemId: string,
  itemType: "CATEGORY" | "INCOME_SOURCE" | "EXPENSE_SOURCE" | "BANK_ACCOUNT",
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  let table: typeof categories | typeof incomeSources | typeof expenseSources | typeof bankAccounts = categories;
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

  // If restoring an Income Source or Expense Source, regenerate upcoming burst events
  if (restored) {
    if (itemType === "INCOME_SOURCE") {
      const inc = restored as typeof incomeSources.$inferSelect;
      const startDate = inc.startDate || new Date().toISOString().split("T")[0];
      if (inc.rrule) {
        const dates = generateBurstDates(inc.rrule, startDate, inc.endDate, 12);
        for (const d of dates) {
          await dbClient.insert(incomeEvents).values({
            incomeSourceId: inc.id,
            expectedDate: d.toISOString().split("T")[0],
            expectedAmount: inc.amount,
            status: "UPCOMING",
            tenantId,
            appId,
            createdBy: userId,
            updatedBy: userId,
          });
        }
      } else {
        await dbClient.insert(incomeEvents).values({
          incomeSourceId: inc.id,
          expectedDate: startDate,
          expectedAmount: inc.amount,
          status: "UPCOMING",
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        });
      }
    } else if (itemType === "EXPENSE_SOURCE") {
      const exp = restored as typeof expenseSources.$inferSelect;
      const startDate = exp.startDate || new Date().toISOString().split("T")[0];
      if (exp.rrule) {
        const dates = generateBurstDates(exp.rrule, startDate, exp.endDate, 12);
        for (const d of dates) {
          await dbClient.insert(expenseEvents).values({
            expenseSourceId: exp.id,
            categoryId: exp.categoryId,
            name: exp.name,
            expectedDate: d.toISOString().split("T")[0],
            expectedAmount: exp.amount,
            status: "UPCOMING",
            tenantId,
            appId,
            createdBy: userId,
            updatedBy: userId,
          });
        }
      } else {
        await dbClient.insert(expenseEvents).values({
          expenseSourceId: exp.id,
          categoryId: exp.categoryId,
          name: exp.name,
          expectedDate: startDate,
          expectedAmount: exp.amount,
          status: "UPCOMING",
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
