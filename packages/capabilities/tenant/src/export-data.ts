import { PgDatabase } from "drizzle-orm/pg-core";
import { 
  categories, 
  incomeSources, 
  incomeEvents, 
  expenseSources, 
  expenseEvents, 
  transactionLedger, 
  bankAccounts, 
  fileNotes, 
  userPreferences 
} from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";

export function exportMyDataHandler(db: PgDatabase<any, any, any>) {
  return async (tenantId: string, userId: string, appId: string) => {
    // 1. Fetch user categories
    const userCategories = await db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.appId, appId)));

    // 2. Fetch income sources & events
    const userIncomeSources = await db
      .select()
      .from(incomeSources)
      .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));

    const userIncomeEvents = await db
      .select()
      .from(incomeEvents)
      .where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)));

    // 3. Fetch expense sources & events
    const userExpenseSources = await db
      .select()
      .from(expenseSources)
      .where(and(eq(expenseSources.tenantId, tenantId), eq(expenseSources.appId, appId)));

    const userExpenseEvents = await db
      .select()
      .from(expenseEvents)
      .where(and(eq(expenseEvents.tenantId, tenantId), eq(expenseEvents.appId, appId)));

    // 4. Fetch transaction ledger
    const userLedger = await db
      .select()
      .from(transactionLedger)
      .where(and(eq(transactionLedger.tenantId, tenantId), eq(transactionLedger.appId, appId)));

    // 5. Fetch bank accounts
    const userBankAccounts = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));

    // 6. Fetch file notes metadata
    const userFileNotes = await db
      .select({
        id: fileNotes.id,
        fileName: fileNotes.fileName,
        fileMimeType: fileNotes.fileMimeType,
        fileSize: fileNotes.fileSize,
        comment: fileNotes.comment,
        createdAt: fileNotes.createdAt,
      })
      .from(fileNotes)
      .where(and(eq(fileNotes.tenantId, tenantId), eq(fileNotes.appId, appId)));

    // 7. Fetch user preferences
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    return {
      exportedAt: new Date().toISOString(),
      userId,
      tenantId,
      categories: userCategories,
      incomeSources: userIncomeSources,
      incomeEvents: userIncomeEvents,
      expenseSources: userExpenseSources,
      expenseEvents: userExpenseEvents,
      transactionLedger: userLedger,
      bankAccounts: userBankAccounts,
      fileNotes: userFileNotes,
      preferences: prefs ?? null,
    };
  };
}
