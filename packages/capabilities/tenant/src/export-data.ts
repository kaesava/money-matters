import { 
  pools,
  categories, 
  incomeSources, 
  incomeEvents, 
  expenseSources, 
  expenseEvents, 
  transactionLedger, 
  bankAccounts, 
  userPreferences,
  tenantUserPreferences,
  allocationPlans,
  allocationPlanLines,
  users,
  tenants,
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

    // 3. Fetch Bank Accounts (Shared OR Private owned by current user)
    const rawBankAccounts = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));

    const userBankAccounts = rawBankAccounts.filter(
      (b) => !b.isPrivate || b.userId === userId
    );
    const allowedBankAccountIds = new Set(userBankAccounts.map((b) => b.id));

    // 4. Fetch Pools
    const rawPools = await db
      .select()
      .from(pools)
      .where(and(eq(pools.tenantId, tenantId), eq(pools.appId, appId)));

    const userPools = rawPools.filter((p) => allowedBankAccountIds.has(p.bankAccountId));
    const allowedPoolIds = new Set(userPools.map((p) => p.id));

    // 5. Fetch Categories
    const rawCategories = await db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.appId, appId)));

    const userCategories = rawCategories.filter((c) => allowedPoolIds.has(c.poolId));

    // 6. Fetch Income Sources & Events
    const userIncomeSources = await db
      .select()
      .from(incomeSources)
      .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));

    const userIncomeEvents = await db
      .select()
      .from(incomeEvents)
      .where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)));

    // 7. Fetch Expense Sources & Events
    const userExpenseSources = await db
      .select()
      .from(expenseSources)
      .where(and(eq(expenseSources.tenantId, tenantId), eq(expenseSources.appId, appId)));

    const userExpenseEvents = await db
      .select()
      .from(expenseEvents)
      .where(and(eq(expenseEvents.tenantId, tenantId), eq(expenseEvents.appId, appId)));

    // 8. Fetch Transaction Ledger
    const rawLedger = await db
      .select()
      .from(transactionLedger)
      .where(and(eq(transactionLedger.tenantId, tenantId), eq(transactionLedger.appId, appId)));

    const userLedger = rawLedger.filter((t) => allowedPoolIds.has(t.poolId));

    // 9. Fetch Allocation Plans & Lines
    const userAllocationPlans = await db
      .select()
      .from(allocationPlans)
      .where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId)));

    const rawAllocationPlanLines = await db
      .select()
      .from(allocationPlanLines)
      .where(and(eq(allocationPlanLines.tenantId, tenantId), eq(allocationPlanLines.appId, appId)));

    const userAllocationPlanLines = rawAllocationPlanLines.filter((l) => allowedPoolIds.has(l.poolId));

    const csvFiles: Record<string, string> = {
      "User_Profile.csv": arrayToCsv(
        userRecord ? [{ ...userRecord, globalTimezone: tenantRecord?.timezone || "Australia/Sydney" }] : [],
        ["id", "email", "displayName", "globalTimezone"]
      ),
      "Household_Profile.csv": arrayToCsv(
        tenantRecord ? [{ ...tenantRecord, ...tenantPrefs }] : [],
        ["id", "name", "country", "state", "postcode", "fyEndMonthDay", "subscriptionStatus"]
      ),
      "Bank_Accounts.csv": arrayToCsv(userBankAccounts, ["id", "name", "bankProvider", "lastKnownBalance", "isPrivate"]),
      "Pools.csv": arrayToCsv(userPools, ["id", "name", "poolType", "bankAccountId", "targetAmount", "everydayAllowanceAmount"]),
      "Categories.csv": arrayToCsv(userCategories, ["id", "poolId", "name", "monthlyAmount", "budgetFrequency"]),
      "Income_Sources.csv": arrayToCsv(userIncomeSources, ["id", "name", "amount", "rrule", "startDate", "receivingAccountId"]),
      "Income_Events.csv": arrayToCsv(userIncomeEvents, ["id", "incomeSourceId", "expectedDate", "expectedAmount", "status"]),
      "Bills_and_Expenses.csv": arrayToCsv(userExpenseSources, ["id", "name", "amount", "rrule", "startDate", "poolId", "categoryId"]),
      "Expense_Events.csv": arrayToCsv(userExpenseEvents, ["id", "expenseSourceId", "expectedDate", "expectedAmount", "poolId", "status"]),
      "Transactions_Ledger.csv": arrayToCsv(userLedger, ["id", "recordedAt", "amount", "flowType", "poolId", "categoryId", "bankAccountId"]),
      "Payday_Allocation_Plans.csv": arrayToCsv(userAllocationPlans, ["id", "incomeEventId", "totalIncomeAmount", "status"]),
      "Payday_Allocation_Plan_Lines.csv": arrayToCsv(userAllocationPlanLines, ["id", "planId", "poolId", "proposedAmount", "confirmedAmount"]),
    };

    return {
      exportedAt: new Date().toISOString(),
      userId,
      tenantId,
      csvFiles,
    };
  };
}
