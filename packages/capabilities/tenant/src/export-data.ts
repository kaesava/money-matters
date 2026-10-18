import { 
  envelopes, 
  incomeSources, 
  incomeEvents, 
  expenseEvents, 
  transactionLedger, 
  bankAccounts, 
  allocationPlans,
  allocationPlanLines,
  tenants,
  users,
  DbOrTx,
} from "@money-matters/db";
import { eq, and } from "drizzle-orm";

function arrayToCsv(items: Record<string, unknown>[], headers: string[]): string {
  if (items.length === 0) return headers.join(",") + "\n";
  const rows = items.map((item) =>
    headers
      .map((header) => {
        const val = item[header];
        if (val === null || val === undefined) return "";
        let str = String(val);
        // Neutralize CSV formula injection (CWE-1236)
        if (/^[=+\-@\t\r]/.test(str)) {
          str = `'${str}`;
        }
        str = str.replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n") + "\n";
}

export function exportDataHandler(db: DbOrTx) {
  return async (tenantId: string, userId: string, appId: string) => {
    // 1. Fetch User Profile
    const [userRecord] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // 2. Fetch Household / Tenant Record
    const [tenantRecord] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    // 3. Fetch Bank Accounts (Filter out partner private accounts)
    const rawBankAccounts = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));

    const userBankAccounts = rawBankAccounts.filter(
      (b) => !b.isPrivate || b.userId === userId
    );
    const allowedBankAccountIds = new Set(userBankAccounts.map((b) => b.id));

    // 4. Fetch Envelopes (Strict stealth privacy: never leak partner's private envelopes)
    const rawEnvelopes = await db
      .select()
      .from(envelopes)
      .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId)));

    const userEnvelopes = rawEnvelopes.filter(
      (e) => !e.isPrivate || e.userId === userId
    );
    const allowedEnvelopeIds = new Set(userEnvelopes.map((e) => e.id));

    // 5. Fetch Income Sources & Events
    const userIncomeSources = await db
      .select()
      .from(incomeSources)
      .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));

    const userIncomeEvents = await db
      .select()
      .from(incomeEvents)
      .where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)));

    // 6. Fetch Expense Events
    const rawExpenseEvents = await db
      .select()
      .from(expenseEvents)
      .where(and(eq(expenseEvents.tenantId, tenantId), eq(expenseEvents.appId, appId)));

    const userExpenseEvents = rawExpenseEvents.filter((e) => allowedEnvelopeIds.has(e.envelopeId));

    // 7. Fetch Transaction Ledger
    const rawLedger = await db
      .select()
      .from(transactionLedger)
      .where(and(eq(transactionLedger.tenantId, tenantId), eq(transactionLedger.appId, appId)));

    const userLedger = rawLedger.filter((t) => allowedEnvelopeIds.has(t.envelopeId));

    // 8. Fetch Allocation Plans & Lines
    const userAllocationPlans = await db
      .select()
      .from(allocationPlans)
      .where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId)));

    const rawAllocationPlanLines = await db
      .select()
      .from(allocationPlanLines)
      .where(and(eq(allocationPlanLines.tenantId, tenantId), eq(allocationPlanLines.appId, appId)));

    const userAllocationPlanLines = rawAllocationPlanLines.filter((l) => allowedEnvelopeIds.has(l.envelopeId));

    const csvFiles: Record<string, string> = {
      "User_Profile.csv": arrayToCsv(
        userRecord ? [{ ...userRecord, globalTimezone: tenantRecord?.timezone || "Australia/Sydney" }] : [],
        ["id", "email", "displayName", "globalTimezone"]
      ),
      "Household_Profile.csv": arrayToCsv(
        tenantRecord ? [{
          id: tenantRecord.id,
          name: tenantRecord.name,
          subscriptionStatus: tenantRecord.subscriptionStatus,
          setupStatus: tenantRecord.setupStatus,
          subscriptionEndsAt: tenantRecord.subscriptionEndsAt,
          cancelAtPeriodEnd: tenantRecord.cancelAtPeriodEnd,
        }] : [],
        ["id", "name", "subscriptionStatus", "setupStatus", "subscriptionEndsAt", "cancelAtPeriodEnd"]
      ),
      "Bank_Accounts.csv": arrayToCsv(userBankAccounts, ["id", "name", "bankProvider", "lastKnownBalance", "isPrivate"]),
      "Envelopes.csv": arrayToCsv(userEnvelopes, ["id", "name", "envelopeType", "bankAccountId", "targetAmount", "monthlyAmount", "budgetFrequency"]),
      "Income_Sources.csv": arrayToCsv(userIncomeSources, ["id", "name", "amount", "rrule", "startDate", "receivingAccountId"]),
      "Income_Events.csv": arrayToCsv(userIncomeEvents, ["id", "incomeSourceId", "expectedDate", "expectedAmount", "status"]),
      "Expense_Events.csv": arrayToCsv(userExpenseEvents, ["id", "expectedDate", "expectedAmount", "envelopeId", "isScheduled", "status"]),
      "Transactions_Ledger.csv": arrayToCsv(userLedger, ["id", "recordedAt", "amount", "flowType", "envelopeId", "bankAccountId"]),
      "Income_Split_Plans.csv": arrayToCsv(userAllocationPlans, ["id", "incomeEventId", "totalIncomeAmount", "status"]),
      "Income_Split_Plan_Lines.csv": arrayToCsv(userAllocationPlanLines, ["id", "planId", "envelopeId", "proposedAmount", "confirmedAmount"]),
    };

    return {
      exportedAt: new Date().toISOString(),
      userId,
      tenantId,
      csvFiles,
    };
  };
}
