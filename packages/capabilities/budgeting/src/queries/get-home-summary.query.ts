import {
  envelopes,
  bankAccounts,
  incomeSources,
  incomeEvents,
  expenseEvents,
  transferEvents,
  userPreferences,
  tenants,
  DbOrTx,
  getEnvelopeBalancesMap,
} from "@money-matters/db";
import { eq, and, sql, asc } from "drizzle-orm";
import { todayInZone, calendarDaysBetween } from "@money-matters/core";
import {
  HomeSummaryDto,
  HomeSummaryAttentionItem,
  HomeSummaryGoalItem,
  HomeSummaryNextPayday,
  HomeSummaryPaceStatus,
} from "@money-matters/types";

export async function getHomeSummaryQuery(
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
): Promise<HomeSummaryDto> {
  // 1. Resolve user's timezone from userPreferences, falling back to Australia/Sydney
  let userTimezone = "Australia/Sydney";
  const [pref] = await dbClient
    .select({ timezone: userPreferences.timezone })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (pref?.timezone) {
    userTimezone = pref.timezone;
  }

  const todayDate = todayInZone(userTimezone);

  // 2. Fetch envelopes with bank account join for privacy
  const dbEnvelopes = await dbClient
    .select({
      id: envelopes.id,
      name: envelopes.name,
      envelopeType: envelopes.envelopeType,
      bankAccountId: envelopes.bankAccountId,
      safetyBufferFloor: envelopes.safetyBufferFloor,
      monthlyAmount: envelopes.monthlyAmount,
      targetAmount: envelopes.targetAmount,
      isPrivate: envelopes.isPrivate,
      userId: envelopes.userId,
      bankAccountUserId: bankAccounts.userId,
      emoji: envelopes.emoji,
      colorKey: envelopes.colorKey,
    })
    .from(envelopes)
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        sql`${envelopes.archivedAt} IS NULL`
      )
    );

  const visibleEnvelopes = dbEnvelopes.filter(
    (e) => !e.isPrivate || (e.userId ? e.userId === userId : e.bankAccountUserId === userId)
  );

  // 3. Compute balances map
  const balancesMap = await getEnvelopeBalancesMap(tenantId, appId, dbClient);

  // 4. Fetch bank accounts
  const dbBankAccounts = await dbClient
    .select({
      id: bankAccounts.id,
      name: bankAccounts.name,
      lastKnownBalance: bankAccounts.lastKnownBalance,
      unbudgetedBuffer: bankAccounts.unbudgetedBuffer,
      lastBalanceMatchedAt: bankAccounts.lastBalanceMatchedAt,
      isPrivate: bankAccounts.isPrivate,
      userId: bankAccounts.userId,
    })
    .from(bankAccounts)
    .where(
      and(
        eq(bankAccounts.tenantId, tenantId),
        eq(bankAccounts.appId, appId),
        sql`${bankAccounts.archivedAt} IS NULL`
      )
    );

  const visibleBankAccounts = dbBankAccounts.filter((b) => !b.isPrivate || b.userId === userId);

  // Find oldest balance matched timestamp across visible bank accounts
  let oldestMatch: string | null = null;
  for (const acc of visibleBankAccounts) {
    if (acc.lastBalanceMatchedAt) {
      const iso = new Date(acc.lastBalanceMatchedAt).toISOString();
      if (!oldestMatch || iso < oldestMatch) {
        oldestMatch = iso;
      }
    }
  }

  // Fetch tenant creation timestamp
  const [tenantRow] = await dbClient
    .select({ createdAt: tenants.createdAt })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  const tenantCreatedAt = tenantRow?.createdAt ? new Date(tenantRow.createdAt).toISOString() : null;

  // Check if tenant has any confirmed income events
  const [confirmedIncomeRow] = await dbClient
    .select({ count: sql<number>`count(*)` })
    .from(incomeEvents)
    .where(
      and(
        eq(incomeEvents.tenantId, tenantId),
        eq(incomeEvents.appId, appId),
        eq(incomeEvents.status, "CONFIRMED"),
        sql`${incomeEvents.archivedAt} IS NULL`
      )
    );
  const hasConfirmedIncome = (Number(confirmedIncomeRow?.count) || 0) > 0;
  const isAwaitingFirstPayday = !hasConfirmedIncome;

  // 5. Calculate category balances & totals
  let everydayBalance = 0;
  let everydayBudget = 0;
  let everydaySafetyBuffer = 0;

  let billsBalance = 0;
  let billsBudget = 0;

  const goals: HomeSummaryGoalItem[] = [];

  for (const env of visibleEnvelopes) {
    const bal = balancesMap[env.id] || 0;
    const monthly = env.monthlyAmount ? parseFloat(env.monthlyAmount) : 0;
    const target = env.targetAmount ? parseFloat(env.targetAmount) : 0;

    if (env.envelopeType === "EVERYDAY") {
      everydayBalance += bal;
      everydayBudget += monthly || target;
      everydaySafetyBuffer += env.safetyBufferFloor ? parseFloat(env.safetyBufferFloor) : 0;
    } else if (env.envelopeType === "SCHEDULED_BILL" || env.envelopeType === "FLEXIBLE_BILL") {
      billsBalance += bal;
      billsBudget += monthly || target;
    } else if (env.envelopeType === "TARGET_GOAL" || env.envelopeType === "ONGOING_GOAL") {
      const progress = target > 0 ? Math.min(100, Math.round((bal / target) * 100)) : (bal > 0 ? 100 : 0);
      goals.push({
        id: env.id,
        name: env.name,
        envelopeType: env.envelopeType,
        currentBalance: bal,
        targetAmount: target > 0 ? target : null,
        progressPercentage: progress,
        emoji: env.emoji ?? null,
        colorKey: env.colorKey ?? null,
      });
    }
  }

  // 6. Upcoming income events
  const dbIncomes = await dbClient
    .select({
      id: incomeEvents.id,
      name: incomeEvents.name,
      expectedAmount: incomeEvents.expectedAmount,
      expectedDate: incomeEvents.expectedDate,
      sourceName: incomeSources.name,
      bankAccountId: incomeSources.receivingAccountId,
      status: incomeEvents.status,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .where(
      and(
        eq(incomeEvents.tenantId, tenantId),
        eq(incomeEvents.appId, appId),
        eq(incomeEvents.status, "PENDING"),
        sql`${incomeEvents.archivedAt} IS NULL`
      )
    )
    .orderBy(asc(incomeEvents.expectedDate));

  let nextPayday: HomeSummaryNextPayday | null = null;
  let daysToPayday = 14;

  if (dbIncomes.length > 0) {
    const firstIncome = dbIncomes[0];
    const matchedAccount = visibleBankAccounts.find((b) => b.id === firstIncome.bankAccountId);
    const availableToBudget = matchedAccount
      ? parseFloat(String(matchedAccount.lastKnownBalance || "0")) -
        parseFloat(String(matchedAccount.unbudgetedBuffer || "0"))
      : null;

    nextPayday = {
      id: firstIncome.id,
      name: firstIncome.name || firstIncome.sourceName || "Paycheck Deposit",
      expectedAmount: parseFloat(firstIncome.expectedAmount),
      expectedDate: firstIncome.expectedDate,
      bankAccountId: firstIncome.bankAccountId ?? null,
      bankAccountName: matchedAccount?.name ?? null,
      availableToBudget,
    };

    daysToPayday = Math.max(0, calendarDaysBetween(todayDate, firstIncome.expectedDate));
  }

  // 7. Upcoming expenses & transfers (Attention Items)
  const dbExpenses = await dbClient
    .select({
      id: expenseEvents.id,
      name: expenseEvents.name,
      expectedAmount: expenseEvents.expectedAmount,
      expectedDate: expenseEvents.expectedDate,
      envelopeId: expenseEvents.envelopeId,
      status: expenseEvents.status,
    })
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        eq(expenseEvents.status, "PENDING"),
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    )
    .orderBy(asc(expenseEvents.expectedDate));

  const dbTransfers = await dbClient
    .select({
      id: transferEvents.id,
      name: transferEvents.name,
      expectedAmount: transferEvents.expectedAmount,
      expectedDate: transferEvents.expectedDate,
      sourceEnvelopeId: transferEvents.sourceEnvelopeId,
      destinationEnvelopeId: transferEvents.destinationEnvelopeId,
      status: transferEvents.status,
    })
    .from(transferEvents)
    .where(
      and(
        eq(transferEvents.tenantId, tenantId),
        eq(transferEvents.appId, appId),
        eq(transferEvents.status, "PENDING"),
        sql`${transferEvents.archivedAt} IS NULL`
      )
    )
    .orderBy(asc(transferEvents.expectedDate));

  // Compute bills due within 14 days or next payday to get shortfall
  const horizonDate = nextPayday?.expectedDate ?? todayInZone(userTimezone, new Date(Date.now() + 14 * 86400000));
  const billsDueInHorizon = dbExpenses.filter(
    (e) => e.expectedDate >= todayDate && e.expectedDate <= horizonDate
  );
  const totalBillsDueInHorizon = billsDueInHorizon.reduce(
    (sum, e) => sum + parseFloat(e.expectedAmount),
    0
  );
  const billsShortfall = Math.max(0, totalBillsDueInHorizon - billsBalance);

  const expenseItems: HomeSummaryAttentionItem[] = dbExpenses.map((e) => {
    const env = visibleEnvelopes.find((p) => p.id === e.envelopeId);
    return {
      id: e.id,
      type: "EXPENSE",
      name: e.name,
      expectedAmount: parseFloat(e.expectedAmount),
      expectedDate: e.expectedDate,
      envelopeId: env?.id ?? null,
      envelopeName: env?.name ?? null,
      isOverdue: e.expectedDate < todayDate,
      currentBalance: env ? balancesMap[env.id] || 0 : undefined,
    };
  });

  const transferItems: HomeSummaryAttentionItem[] = dbTransfers.map((t) => {
    const srcEnv = visibleEnvelopes.find((p) => p.id === t.sourceEnvelopeId);
    const destEnv = visibleEnvelopes.find((p) => p.id === t.destinationEnvelopeId);
    return {
      id: t.id,
      type: "TRANSFER",
      name: t.name || `Transfer: ${srcEnv?.name ?? "Source"} ➔ ${destEnv?.name ?? "Destination"}`,
      expectedAmount: parseFloat(t.expectedAmount),
      expectedDate: t.expectedDate,
      envelopeId: null,
      envelopeName: null,
      isOverdue: t.expectedDate < todayDate,
      sourcePoolId: t.sourceEnvelopeId,
      sourcePoolName: srcEnv?.name ?? "Source Envelope",
      destinationPoolId: t.destinationEnvelopeId,
      destinationPoolName: destEnv?.name ?? "Destination Envelope",
    };
  });

  const attentionItems = [...expenseItems, ...transferItems].sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.expectedDate.localeCompare(b.expectedDate);
  });

  // 8. Safe to Spend & Pace calculations
  // Safe to spend = everyday balance minus safety buffer floor minus any bills shortfall
  const rawSafeToSpend = Math.max(0, everydayBalance - everydaySafetyBuffer - billsShortfall);
  const safeToSpend = Math.round(rawSafeToSpend * 100) / 100;
  const safeToSpendCents = Math.round(safeToSpend * 100);

  const divisorDays = Math.max(1, daysToPayday);
  const dailyPace = Math.round((safeToSpend / divisorDays) * 100) / 100;

  // Expected daily pace from total budget
  const expectedDailyBudget = everydayBudget > 0 ? everydayBudget / 30 : 0;
  let paceStatus: HomeSummaryPaceStatus = "ON_TRACK";
  if (isAwaitingFirstPayday) {
    paceStatus = "AWAITING_FIRST_PAYDAY";
  } else if (safeToSpend <= 0) {
    paceStatus = "CRITICAL";
  } else if (expectedDailyBudget > 0) {
    if (dailyPace >= expectedDailyBudget * 1.1) {
      paceStatus = "AHEAD";
    } else if (dailyPace < expectedDailyBudget * 0.7) {
      paceStatus = "BEHIND";
    }
  }

  return {
    safeToSpend,
    safeToSpendCents,
    daysToPayday,
    dailyPace,
    paceStatus,
    everydayBalance,
    everydayBudget,
    everydaySafetyBuffer,
    billsBalance,
    billsBudget,
    billsShortfall,
    nextPayday,
    attentionItems,
    goals,
    oldestBalanceMatchAt: oldestMatch,
    tenantCreatedAt,
    hasConfirmedIncome,
    isAwaitingFirstPayday,
    todayDate,
  };
}
