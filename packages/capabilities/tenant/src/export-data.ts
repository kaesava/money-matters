import { 
  categories, 
  incomeSources, 
  incomeEvents, 
  expenseSources, 
  expenseEvents, 
  transactionLedger, 
  bankAccounts, 
  fileNotes, 
  userPreferences,
  tenantUserPreferences,
  allocationPlans,
  allocationPlanLines,
  DbOrTx
} from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";

function arrayToCsv(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const val = row[header];
        if (val === null || val === undefined) return '""';
        const str = typeof val === "object" ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function exportMyDataHandler(db: DbOrTx) {
  return async (tenantId: string, userId: string, appId: string) => {
    // 1. Fetch user categories (Shared OR Private owned by current user)
    const rawCategories = await db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.appId, appId)));

    const userCategories = rawCategories.filter(
      (c) => !c.isPrivate || c.userId === userId
    );

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

    // 4. Fetch bank accounts (Shared OR Private owned by current user)
    const rawBankAccounts = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));

    const userBankAccounts = rawBankAccounts.filter(
      (b) => !b.isPrivate || b.userId === userId
    );

    const allowedCategoryIds = new Set(userCategories.map((c) => c.id));

    // 5. Fetch transaction ledger (filtered to allowed categories)
    const rawLedger = await db
      .select()
      .from(transactionLedger)
      .where(and(eq(transactionLedger.tenantId, tenantId), eq(transactionLedger.appId, appId)));

    const userLedger = rawLedger.filter(
      (t) => !t.categoryId || allowedCategoryIds.has(t.categoryId)
    );

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

    // 6.5 Fetch allocation plans
    const userAllocationPlans = await db
      .select()
      .from(allocationPlans)
      .where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId)));

    const userAllocationPlanLines = await db
      .select()
      .from(allocationPlanLines)
      .where(and(eq(allocationPlanLines.tenantId, tenantId), eq(allocationPlanLines.appId, appId)));

    // 7. Fetch user preferences
    const [globalPrefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const [tenantPrefs] = await db
      .select()
      .from(tenantUserPreferences)
      .where(and(eq(tenantUserPreferences.userId, userId), eq(tenantUserPreferences.tenantId, tenantId), eq(tenantUserPreferences.appId, appId)))
      .limit(1);

    const jsonPayload = {
      exportedAt: new Date().toISOString(),
      userId,
      tenantId,
      preferences: {
        global: globalPrefs || null,
        tenant: tenantPrefs || null,
      },
      categories: userCategories,
      incomeSources: userIncomeSources,
      incomeEvents: userIncomeEvents,
      expenseSources: userExpenseSources,
      expenseEvents: userExpenseEvents,
      transactionLedger: userLedger,
      bankAccounts: userBankAccounts,
      fileNotes: userFileNotes,
      allocationPlans: userAllocationPlans,
      allocationPlanLines: userAllocationPlanLines,
    };

    const csvFiles = {
      "categories.csv": arrayToCsv(userCategories),
      "income_sources.csv": arrayToCsv(userIncomeSources),
      "expense_sources.csv": arrayToCsv(userExpenseSources),
      "transaction_ledger.csv": arrayToCsv(userLedger),
      "bank_accounts.csv": arrayToCsv(userBankAccounts),
      "allocation_plans.csv": arrayToCsv(userAllocationPlans),
      "allocation_plan_lines.csv": arrayToCsv(userAllocationPlanLines),
    };

    return {
      ...jsonPayload,
      csvFiles,
    };
  };
}
