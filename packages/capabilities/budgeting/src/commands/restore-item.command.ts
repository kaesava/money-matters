import { pools, categories, incomeSources, expenseSources, incomeEvents, expenseEvents, bankAccounts, DbOrTx } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { generateBurstDates } from "../engine/burst-engine.js";

const getAestDateString = (d: Date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);

export async function restoreItemCommand(
  itemId: string,
  itemType: "POOL" | "CATEGORY" | "INCOME_SOURCE" | "EXPENSE_SOURCE" | "BANK_ACCOUNT",
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
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

  if (restored) {
    if (itemType === "INCOME_SOURCE") {
      const inc = restored as typeof incomeSources.$inferSelect;
      const startDate = inc.startDate || getAestDateString();
      if (inc.rrule) {
        const dates = generateBurstDates(inc.rrule, startDate, inc.endDate, 12);
        if (dates.length > 0) {
          await dbClient.insert(incomeEvents).values(
            dates.map((d) => ({
              incomeSourceId: inc.id,
              expectedDate: getAestDateString(d),
              expectedAmount: inc.amount,
              status: "UPCOMING" as const,
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
          status: "UPCOMING",
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        });
      }
    } else if (itemType === "EXPENSE_SOURCE") {
      const exp = restored as typeof expenseSources.$inferSelect;
      const startDate = exp.startDate || getAestDateString();
      if (exp.rrule) {
        const dates = generateBurstDates(exp.rrule, startDate, exp.endDate, 12);
        if (dates.length > 0) {
          await dbClient.insert(expenseEvents).values(
            dates.map((d) => ({
              expenseSourceId: exp.id,
              poolId: exp.poolId,
              categoryId: exp.categoryId,
              name: exp.name,
              expectedDate: getAestDateString(d),
              expectedAmount: exp.amount,
              status: "UPCOMING" as const,
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

