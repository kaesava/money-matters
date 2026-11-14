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
import { serializeCsvObjects, DEFAULT_TIMEZONE } from "@money-matters/types";

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

    // 5. Fetch Income Sources & Events (exclude partner private receiving accounts)
    const rawIncomeSources = await db
      .select()
      .from(incomeSources)
      .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));

    const userIncomeSources = rawIncomeSources.filter(
      (s) => !s.receivingAccountId || allowedBankAccountIds.has(s.receivingAccountId)
    );
    const allowedIncomeSourceIds = new Set(userIncomeSources.map((s) => s.id));

    const rawIncomeEvents = await db
      .select()
      .from(incomeEvents)
      .where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)));

    const userIncomeEvents = rawIncomeEvents.filter(
      (e) => !e.incomeSourceId || allowedIncomeSourceIds.has(e.incomeSourceId)
    );
    const allowedIncomeEventIds = new Set(userIncomeEvents.map((e) => e.id));

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
    const rawAllocationPlans = await db
      .select()
      .from(allocationPlans)
      .where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId)));

    const userAllocationPlans = rawAllocationPlans.filter((p) => allowedIncomeEventIds.has(p.incomeEventId));

    const rawAllocationPlanLines = await db
      .select()
      .from(allocationPlanLines)
      .where(and(eq(allocationPlanLines.tenantId, tenantId), eq(allocationPlanLines.appId, appId)));

    const userAllocationPlanLines = rawAllocationPlanLines.filter((l) => allowedEnvelopeIds.has(l.envelopeId));

    const csvFiles: Record<string, string> = {
      "User_Profile.csv": serializeCsvObjects(
        userRecord ? [{ ...userRecord, globalTimezone: tenantRecord?.timezone || DEFAULT_TIMEZONE }] : [],
        ["id", "email", "displayName", "globalTimezone"]
      ),
      "Household_Profile.csv": serializeCsvObjects(
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
      "Bank_Accounts.csv": serializeCsvObjects(userBankAccounts, ["id", "name", "bankProvider", "lastKnownBalance", "isPrivate"]),
      "Envelopes.csv": serializeCsvObjects(userEnvelopes, ["id", "name", "envelopeType", "bankAccountId", "targetAmount", "monthlyAmount", "budgetFrequency"]),
      "Income_Sources.csv": serializeCsvObjects(userIncomeSources, ["id", "name", "amount", "rrule", "startDate", "receivingAccountId"]),
      "Income_Events.csv": serializeCsvObjects(userIncomeEvents, ["id", "incomeSourceId", "expectedDate", "expectedAmount", "status"]),
      "Expense_Events.csv": serializeCsvObjects(userExpenseEvents, ["id", "expectedDate", "expectedAmount", "envelopeId", "isScheduled", "status"]),
      "Transactions_Ledger.csv": serializeCsvObjects(userLedger, ["id", "recordedAt", "amount", "flowType", "envelopeId", "bankAccountId"]),
      "Income_Split_Plans.csv": serializeCsvObjects(userAllocationPlans, ["id", "incomeEventId", "totalIncomeAmount", "status"]),
      "Income_Split_Plan_Lines.csv": serializeCsvObjects(userAllocationPlanLines, ["id", "planId", "envelopeId", "proposedAmount", "confirmedAmount"]),
    };

    return {
      exportedAt: new Date().toISOString(),
      userId,
      tenantId,
      csvFiles,
    };
  };
}
