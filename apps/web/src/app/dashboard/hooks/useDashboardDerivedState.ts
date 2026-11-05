import { useMemo } from "react";
import type { WebAttentionItem } from "../components/AttentionItemsList";
import type { WebIncomeItem } from "../components/NextPaydayCard";

interface UseDashboardDerivedStateParams {
  pools: Array<{
    id: string;
    name: string;
    envelopeType: string;
    currentBalance?: string | number | null;
    monthlyAmount?: string | null;
    targetAmount?: string | null;
    safetyBufferFloor?: string | null;
    healthStatus?: string | null;
    endDate?: string | null;
    goalMode?: string | null;
    enteredAmount?: string | null;
    budgetFrequency?: string | null;
    createdAt?: string | Date | null;
    bankAccountId?: string | null;
    isSurplusTarget?: boolean | null;
  }>;
  bankAccounts: Array<{
    id: string;
    name: string;
    lastKnownBalance?: string | null;
    unbudgetedBuffer?: string | null;
  }>;
  homeData?: {
    everydayBalance?: number;
    safeToSpend?: number;
    dailyPace?: number;
    paceStatus?: "AHEAD" | "ON_TRACK" | "BEHIND" | "CRITICAL" | "AWAITING_FIRST_PAYDAY";
    billsBalance?: number;
    daysToPayday?: number;
    oldestBalanceMatchAt?: string | null;
    tenantCreatedAt?: string | null;
    isAwaitingFirstPayday?: boolean;
  } | null;
  summaryData?: {
    everydayRemaining?: string;
    billsRemaining?: string;
  } | null;
  incomeEvents?: Array<{
    id: string;
    status: string;
    sourceName?: string | null;
    expectedAmount: string;
    expectedDate: string;
    bankAccountId?: string | null;
  }>;
  expenseEvents?: Array<{
    id: string;
    status: string;
    name: string;
    expectedAmount: string;
    expectedDate: string;
    envelopeId?: string | null;
  }>;
  transferEvents?: Array<{
    id: string;
    status: string;
    name?: string | null;
    expectedAmount: string;
    expectedDate: string;
    sourcePoolId?: string | null;
    sourcePoolName?: string | null;
    destinationPoolId?: string | null;
    destinationPoolName?: string | null;
  }>;
  todayStr: string;
}

export function useDashboardDerivedState({
  pools,
  bankAccounts,
  homeData,
  summaryData,
  incomeEvents = [],
  expenseEvents = [],
  transferEvents = [],
  todayStr,
}: UseDashboardDerivedStateParams) {
  const goalCategories = useMemo(
    () => pools.filter((p) => p.envelopeType === "TARGET_GOAL" || p.envelopeType === "ONGOING_GOAL"),
    [pools]
  );

  const everydayBalance = homeData?.everydayBalance ?? parseFloat(summaryData?.everydayRemaining || "0");
  const safeToSpend = homeData?.safeToSpend ?? everydayBalance;
  const dailyPace = homeData?.dailyPace;
  const paceStatus = homeData?.paceStatus;

  const everydayMonthlyBudget = useMemo(
    () =>
      pools
        .filter((p) => p.envelopeType === "EVERYDAY")
        .reduce((sum, p) => sum + parseFloat(p.monthlyAmount || p.targetAmount || "0"), 0),
    [pools]
  );

  const everydaySafetyBuffer = useMemo(
    () =>
      pools
        .filter((p) => p.envelopeType === "EVERYDAY")
        .reduce((sum, p) => sum + parseFloat(p.safetyBufferFloor || "0"), 0),
    [pools]
  );

  const billsBalance = homeData?.billsBalance ?? parseFloat(summaryData?.billsRemaining || "0");
  const billsMonthlyBudget = useMemo(
    () =>
      pools
        .filter((p) => p.envelopeType === "SCHEDULED_BILL" || p.envelopeType === "FLEXIBLE_BILL")
        .reduce((sum, p) => sum + parseFloat(p.monthlyAmount || p.targetAmount || "0"), 0),
    [pools]
  );

  const upcomingIncomeList: WebIncomeItem[] = useMemo(
    () =>
      incomeEvents
        .filter((e) => e.status === "PENDING")
        .map((e) => {
          const matchedAccount = bankAccounts.find((b) => b.id === e.bankAccountId);
          const availableToBudget = matchedAccount
            ? parseFloat(String(matchedAccount.lastKnownBalance || "0")) -
              parseFloat(String(matchedAccount.unbudgetedBuffer || "0"))
            : null;

          return {
            id: e.id,
            name: e.sourceName || "Paycheck Deposit",
            amount: parseFloat(e.expectedAmount),
            expectedDate: e.expectedDate,
            bankAccountId: e.bankAccountId ?? null,
            bankAccountName: matchedAccount?.name ?? null,
            availableToBudget,
          };
        }),
    [incomeEvents, bankAccounts]
  );

  const nextPaycheck = upcomingIncomeList[0] ?? null;
  const daysUntilPayday =
    homeData?.daysToPayday ??
    (nextPaycheck
      ? Math.max(
          0,
          Math.round(
            (new Date(nextPaycheck.expectedDate + "T00:00:00Z").getTime() -
              new Date(todayStr + "T00:00:00Z").getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 14);

  const isBalanceMatchOverdue = useMemo(() => {
    if (bankAccounts.length === 0) return false;
    if (homeData?.oldestBalanceMatchAt) {
      const lastMatchDate = new Date(homeData.oldestBalanceMatchAt).getTime();
      return Date.now() - lastMatchDate > 14 * 24 * 60 * 60 * 1000;
    }
    if (homeData?.tenantCreatedAt) {
      const accountAge = Date.now() - new Date(homeData.tenantCreatedAt).getTime();
      return accountAge > 14 * 24 * 60 * 60 * 1000;
    }
    return false;
  }, [bankAccounts.length, homeData?.oldestBalanceMatchAt, homeData?.tenantCreatedAt]);

  const attentionItems: WebAttentionItem[] = useMemo(() => {
    const todayObj = new Date(todayStr);

    const expenseAttentionItems: WebAttentionItem[] = expenseEvents
      .filter((e) => e.status === "PENDING")
      .map((e) => {
        const pool = pools.find((p) => p.id === e.envelopeId);
        const catBal = pool ? parseFloat(String(pool.currentBalance)) : 0;
        const isOverdue = new Date(e.expectedDate) < todayObj;

        return {
          id: e.id,
          type: "EXPENSE" as const,
          name: e.name,
          expectedAmount: parseFloat(e.expectedAmount),
          expectedDate: e.expectedDate,
          categoryId: pool?.id ?? null,
          categoryName: pool?.name ?? "Regular Bill",
          isOverdue,
          categoryBalance: catBal,
        };
      });

    const transferAttentionItems: WebAttentionItem[] = transferEvents
      .filter((e) => e.status === "PENDING")
      .map((e) => {
        const srcPool = pools.find((p) => p.id === e.sourcePoolId);
        const destPool = pools.find((p) => p.id === e.destinationPoolId);
        const isOverdue = new Date(e.expectedDate) < todayObj;

        return {
          id: e.id,
          type: "TRANSFER" as const,
          name: e.name || `Transfer: ${srcPool?.name ?? "Source"} ➔ ${destPool?.name ?? "Destination"}`,
          expectedAmount: parseFloat(e.expectedAmount),
          expectedDate: e.expectedDate,
          sourcePoolId: e.sourcePoolId,
          sourcePoolName: srcPool?.name ?? e.sourcePoolName ?? "Source Pool",
          destinationPoolId: e.destinationPoolId,
          destinationPoolName: destPool?.name ?? e.destinationPoolName ?? "Destination Pool",
          isOverdue,
        };
      });

    return [...expenseAttentionItems, ...transferAttentionItems].sort((a, b) => {
      const aOverdue = a.isOverdue || a.expectedDate < todayStr;
      const bOverdue = b.isOverdue || b.expectedDate < todayStr;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime();
    });
  }, [expenseEvents, transferEvents, pools, todayStr]);

  const upcomingBillsList = useMemo(
    () =>
      expenseEvents
        .filter((e) => e.status === "PENDING")
        .map((e) => ({
          id: e.id,
          name: e.name,
          amount: parseFloat(e.expectedAmount),
          dueDate: e.expectedDate,
        })),
    [expenseEvents]
  );

  const billsDue14Days = useMemo(() => {
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    return upcomingBillsList.filter((b) => {
      const due = new Date(b.dueDate).getTime();
      return due >= new Date().getTime() - 86400000 && due <= new Date().getTime() + fourteenDaysMs;
    });
  }, [upcomingBillsList]);

  const totalBillsDue14Days = useMemo(
    () => billsDue14Days.reduce((sum, b) => sum + b.amount, 0),
    [billsDue14Days]
  );

  const billsShortfall = Math.max(0, totalBillsDue14Days - billsBalance);

  return {
    goalCategories,
    everydayBalance,
    safeToSpend,
    dailyPace,
    paceStatus,
    everydayMonthlyBudget,
    everydaySafetyBuffer,
    billsBalance,
    billsMonthlyBudget,
    upcomingIncomeList,
    nextPaycheck,
    daysUntilPayday,
    isBalanceMatchOverdue,
    attentionItems,
    upcomingBillsList,
    billsDue14Days,
    totalBillsDue14Days,
    billsShortfall,
  };
}
