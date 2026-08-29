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
  users,
  tenants,
  tenantUsers,
  DbOrTx
} from "@money-matters/db";
import { eq, and } from "drizzle-orm";

function arrayToCsv(data: Record<string, unknown>[], defaultHeaders: string[] = []): string {
  if (!data || data.length === 0) {
    return defaultHeaders.length > 0 ? defaultHeaders.join(",") + "\n" : "id\n";
  }
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
    // 1. Fetch User Record & Preferences
    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const [globalPrefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    // 2. Fetch Household Tenant & User Preferences
    const [tenantRecord] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const [tenantPrefs] = await db
      .select()
      .from(tenantUserPreferences)
      .where(and(eq(tenantUserPreferences.userId, userId), eq(tenantUserPreferences.tenantId, tenantId), eq(tenantUserPreferences.appId, appId)))
      .limit(1);

    // 3. Fetch Categories (Shared OR Private owned by current user)
    const rawCategories = await db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.appId, appId)));

    const userCategories = rawCategories.filter(
      (c) => !c.isPrivate || c.userId === userId
    );

    // 4. Fetch Income Sources & Events
    const userIncomeSources = await db
      .select()
      .from(incomeSources)
      .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));

    const userIncomeEvents = await db
      .select()
      .from(incomeEvents)
      .where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)));

    // 5. Fetch Expense Sources & Events
    const userExpenseSources = await db
      .select()
      .from(expenseSources)
      .where(and(eq(expenseSources.tenantId, tenantId), eq(expenseSources.appId, appId)));

    const userExpenseEvents = await db
      .select()
      .from(expenseEvents)
      .where(and(eq(expenseEvents.tenantId, tenantId), eq(expenseEvents.appId, appId)));

    // 6. Fetch Bank Accounts (Shared OR Private owned by current user)
    const rawBankAccounts = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));

    const userBankAccounts = rawBankAccounts.filter(
      (b) => !b.isPrivate || b.userId === userId
    );

    const allowedCategoryIds = new Set(userCategories.map((c) => c.id));

    // 7. Fetch Transaction Ledger
    const rawLedger = await db
      .select()
      .from(transactionLedger)
      .where(and(eq(transactionLedger.tenantId, tenantId), eq(transactionLedger.appId, appId)));

    const userLedger = rawLedger.filter(
      (t) => !t.categoryId || allowedCategoryIds.has(t.categoryId)
    );

    // 8. Fetch File Notes metadata
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

    // 9. Fetch Allocation Plans & Lines
    const userAllocationPlans = await db
      .select()
      .from(allocationPlans)
      .where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId)));

    const userAllocationPlanLines = await db
      .select()
      .from(allocationPlanLines)
      .where(and(eq(allocationPlanLines.tenantId, tenantId), eq(allocationPlanLines.appId, appId)));

    const csvFiles: Record<string, string> = {
      "User_Profile.csv": arrayToCsv(
        userRecord ? [{ ...userRecord, globalTimezone: globalPrefs?.timezone || "Australia/Sydney" }] : [],
        ["id", "email", "displayName", "globalTimezone"]
      ),
      "Household_Profile.csv": arrayToCsv(
        tenantRecord ? [{ ...tenantRecord, ...tenantPrefs }] : [],
        ["id", "name", "country", "state", "postcode", "fyEndMonthDay", "subscriptionStatus"]
      ),
      "Categories.csv": arrayToCsv(userCategories, ["id", "name", "type", "monthlyAmount", "targetAmount", "isPrivate"]),
      "Bank_Accounts.csv": arrayToCsv(userBankAccounts, ["id", "name", "institution", "accountType", "currentBalance", "isPrivate"]),
      "Income_Sources.csv": arrayToCsv(userIncomeSources, ["id", "name", "amount", "rrule", "startDate", "receivingAccountId"]),
      "Income_Events.csv": arrayToCsv(userIncomeEvents, ["id", "incomeSourceId", "expectedDate", "expectedAmount", "status"]),
      "Bills_and_Expenses.csv": arrayToCsv(userExpenseSources, ["id", "name", "amount", "rrule", "startDate", "categoryId"]),
      "Expense_Events.csv": arrayToCsv(userExpenseEvents, ["id", "expenseSourceId", "expectedDate", "expectedAmount", "status"]),
      "Transactions_Ledger.csv": arrayToCsv(userLedger, ["id", "date", "description", "amount", "flow", "categoryId", "bankAccountId"]),
      "Payday_Allocation_Plans.csv": arrayToCsv(userAllocationPlans, ["id", "incomeEventId", "planDate", "totalIncome", "status"]),
      "Payday_Allocation_Plan_Lines.csv": arrayToCsv(userAllocationPlanLines, ["id", "allocationPlanId", "categoryId", "allocatedAmount"]),
      "Notes_and_Attachments.csv": arrayToCsv(userFileNotes, ["id", "fileName", "fileMimeType", "fileSize", "comment", "createdAt"]),
    };

    return {
      exportedAt: new Date().toISOString(),
      userId,
      tenantId,
      csvFiles,
    };
  };
}
