import { useState, useEffect, useMemo, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { trpc, setActiveSessionToken } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { formatIsoDate } from '../../lib/format';
import { triggerHaptic } from '../../lib/haptics';
import { t } from '@money-matters/i18n';
import { MobileIncomeItem } from './MobileNextPaydayCard';
import { AttentionItem } from '../AttentionItemsList';

export function useHomeData(token?: string) {
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (token) {
      SecureStore.setItemAsync('money-matters_session_token', token);
      SecureStore.setItemAsync('money-matters-session-token', token);
      setActiveSessionToken(token);
    }
  }, [token]);

  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1;
  const todayStr = useMemo(() => formatIsoDate(new Date()), []);
  const [refreshing, setRefreshing] = useState(false);

  const summaryQuery = trpc.getMonthlySummary.useQuery({ year: todayYear, month: todayMonth }, { enabled: !!session?.user });
  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: !!session?.user });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: !!session?.user });
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery(undefined, { enabled: !!session?.user });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, { enabled: !!session?.user });
  const transferEventsQuery = trpc.listTransferEvents.useQuery(undefined, { enabled: !!session?.user });

  const pools = poolsQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];

  const executeTransferMutation = trpc.executeTransferEvent.useMutation({
    onSuccess: () => {
      transferEventsQuery.refetch();
      poolsQuery.refetch();
      utils.listTransactions.invalidate();
    },
  });

  const deleteTransferMutation = trpc.deleteTransferEvent.useMutation({
    onSuccess: () => { transferEventsQuery.refetch(); },
  });

  const deleteExpenseMutation = trpc.deleteExpenseEvent.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      poolsQuery.refetch();
    },
  });

  const deleteIncomeMutation = trpc.deleteIncomeEvent.useMutation({
    onSuccess: () => { incomeEventsQuery.refetch(); },
  });

  const onRefresh = useCallback(async () => {
    triggerHaptic('light');
    setRefreshing(true);
    await Promise.all([
      summaryQuery.refetch(),
      poolsQuery.refetch(),
      bankAccountsQuery.refetch(),
      incomeEventsQuery.refetch(),
      expenseEventsQuery.refetch(),
      transferEventsQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [summaryQuery, poolsQuery, bankAccountsQuery, incomeEventsQuery, expenseEventsQuery, transferEventsQuery]);

  const needsAttentionCount = pools.filter((c) => c.healthStatus === 'AMBER').length;
  const behindCount = pools.filter((c) => c.healthStatus === 'RED').length;
  const onTrackCount = pools.filter((c) => c.healthStatus === 'GREEN').length;

  const everydayBalance = parseFloat(summaryQuery.data?.everydayRemaining || '0');
  const everydayMonthlyBudget = pools
    .filter((c) => c.poolType === 'EVERYDAY')
    .reduce((sum, c) => sum + parseFloat(c.everydayAllowanceAmount || c.targetAmount || '0'), 0);

  const billsBalance = parseFloat(summaryQuery.data?.billsRemaining || '0');
  const billsMonthlyBudget = pools
    .filter((c) => c.poolType === 'REGULAR')
    .reduce((sum, c) => sum + parseFloat(c.targetAmount || '0'), 0);

  const upcomingIncomeList: MobileIncomeItem[] = useMemo(() => {
    return (incomeEventsQuery.data ?? [])
      .filter((e) => e.status === 'PENDING')
      .map((e) => {
        const matched = bankAccounts.find((b) => b.id === e.bankAccountId);
        const avail = matched
          ? parseFloat(String(matched.lastKnownBalance || '0')) - parseFloat(String(matched.unbudgetedBuffer || '0'))
          : null;
        return {
          id: e.id,
          name: e.sourceName || t('dashboard.title'),
          amount: parseFloat(e.expectedAmount),
          expectedDate: e.expectedDate,
          status: e.status,
          bankAccountId: e.bankAccountId ?? null,
          bankAccountName: matched?.name ?? null,
          availableToBudget: avail,
        };
      });
  }, [incomeEventsQuery.data, bankAccounts]);

  const nextPaycheck = upcomingIncomeList[0] ?? null;
  const daysUntilPayday = nextPaycheck
    ? Math.max(0, Math.ceil((new Date(nextPaycheck.expectedDate + 'T00:00:00+10:00').getTime() - new Date().getTime()) / 86400000))
    : 14;

  const upcomingBillsList = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === 'PENDING')
    .map((e) => ({ id: e.id, name: e.name, amount: parseFloat(e.expectedAmount), dueDate: e.expectedDate }));

  const billsDue14Days = upcomingBillsList.filter((b) => {
    const due = new Date(b.dueDate).getTime();
    return due >= new Date().getTime() - 86400000 && due <= new Date().getTime() + 14 * 86400000;
  });

  const totalBillsDue14Days = billsDue14Days.reduce((sum, b) => sum + b.amount, 0);
  const billsShortfall = Math.max(0, totalBillsDue14Days - billsBalance);

  const todayObj = useMemo(() => new Date(todayStr), [todayStr]);

  const attentionItems: AttentionItem[] = useMemo(() => {
    const expItems: AttentionItem[] = (expenseEventsQuery.data ?? [])
      .filter((e) => e.status === 'PENDING')
      .map((e) => {
        const pool = pools.find((c) => c.id === (e.categoryId || e.poolId));
        const poolBal = pool ? (typeof pool.currentBalance === 'number' ? pool.currentBalance : parseFloat(String(pool.currentBalance) || '0')) : 0;
        return {
          id: e.id,
          type: 'EXPENSE' as const,
          name: e.name,
          expectedAmount: parseFloat(e.expectedAmount),
          expectedDate: e.expectedDate,
          categoryId: e.categoryId || e.poolId,
          categoryName: pool?.name ?? t('poolTypes.bills'),
          isOverdue: new Date(e.expectedDate) < todayObj,
          categoryBalance: poolBal,
        };
      });

    const txItems: AttentionItem[] = (transferEventsQuery.data ?? [])
      .filter((e) => e.status === 'PENDING')
      .map((e) => {
        const srcPool = pools.find((p) => p.id === e.sourcePoolId);
        const destPool = pools.find((p) => p.id === e.destinationPoolId);
        return {
          id: e.id,
          type: 'TRANSFER' as const,
          name: e.name || `Transfer: ${srcPool?.name ?? 'Source'} ➔ ${destPool?.name ?? 'Destination'}`,
          expectedAmount: parseFloat(e.expectedAmount),
          expectedDate: e.expectedDate,
          sourcePoolId: e.sourcePoolId,
          sourcePoolName: srcPool?.name ?? e.sourcePoolName ?? 'Source',
          destinationPoolId: e.destinationPoolId,
          destinationPoolName: destPool?.name ?? e.destinationPoolName ?? 'Destination',
          isOverdue: new Date(e.expectedDate) < todayObj,
          categoryBalance: 0,
        };
      });

    return [...expItems, ...txItems].sort((a, b) => {
      const aO = a.isOverdue || a.expectedDate < todayStr;
      const bO = b.isOverdue || b.expectedDate < todayStr;
      if (aO && !bO) return -1;
      if (!aO && bO) return 1;
      return new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime();
    });
  }, [expenseEventsQuery.data, transferEventsQuery.data, pools, todayObj, todayStr]);

  const goalsList = pools.filter((p) => p.poolType === 'GOAL');
  const everydayPool = pools.find((p) => p.poolType === 'EVERYDAY');
  const billsPool = pools.find((p) => p.poolType === 'REGULAR');

  return {
    session,
    refreshing,
    onRefresh,
    pools,
    bankAccounts,
    incomeCount: incomeEventsQuery.data?.length ?? 0,
    billsCount: expenseEventsQuery.data?.length ?? 0,
    everydayBalance,
    everydayMonthlyBudget,
    everydaySafetyBuffer: pools
      .filter((c) => c.poolType === 'EVERYDAY')
      .reduce((sum, c) => sum + parseFloat(c.safetyBufferFloor || '0'), 0),
    billsBalance,
    billsMonthlyBudget,
    daysUntilPayday,
    billsShortfall,
    billsDue14DaysCount: billsDue14Days.length,
    totalBillsDue14Days,
    needsAttentionCount,
    behindCount,
    onTrackCount,
    upcomingIncomeList,
    attentionItems,
    goalsList,
    everydayPool,
    billsPool,
    executeTransferMutation,
    deleteTransferMutation,
    deleteExpenseMutation,
    deleteIncomeMutation,
    refetchAll: () => {
      expenseEventsQuery.refetch();
      poolsQuery.refetch();
      summaryQuery.refetch();
    },
  };
}
