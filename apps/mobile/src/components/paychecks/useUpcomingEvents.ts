import { useMemo } from 'react';
import { t } from '@money-matters/i18n';
import { TimelineEventItem } from './PaycheckEventSection';

interface UseUpcomingEventsProps {
  rawIncomeEvents: any[];
  rawExpenseEvents: any[];
  rawTransferEvents: any[];
  bankAccounts: any[];
  pools: any[];
  upcomingKindFilter: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';
  upcomingScopeFilter: 'ALL' | 'SHARED' | 'PRIVATE';
  upcomingSearchQuery: string;
  upcomingSortField: 'date' | 'name' | 'amount';
  upcomingSortOrder: 'asc' | 'desc';
}

export function useUpcomingEvents({
  rawIncomeEvents,
  rawExpenseEvents,
  rawTransferEvents,
  bankAccounts,
  pools,
  upcomingKindFilter,
  upcomingScopeFilter,
  upcomingSearchQuery,
  upcomingSortField,
  upcomingSortOrder,
}: UseUpcomingEventsProps) {
  const unifiedTimelineEvents: TimelineEventItem[] = useMemo(() => {
    const list: TimelineEventItem[] = [];

    rawIncomeEvents.forEach((e) => {
      const acct = bankAccounts.find((b) => b.id === (e as any).receivingAccountId);
      list.push({
        id: e.id,
        kind: 'INCOME',
        name: e.name || t('badges.income') || 'Income',
        expectedAmount: e.expectedAmount,
        expectedDate: e.expectedDate,
        accountId: acct?.id || (e as any).receivingAccountId,
        accountName: acct?.name || null,
        isPrivate: acct?.isPrivate || false,
        rawIncome: {
          id: e.id,
          name: e.name,
          expectedAmount: e.expectedAmount,
          expectedDate: e.expectedDate,
          accountId: acct?.id,
          accountName: acct?.name,
          isPrivate: acct?.isPrivate,
        },
      });
    });

    rawExpenseEvents.forEach((e) => {
      const pool = pools.find((p) => p.id === (e.poolId || e.categoryId));
      list.push({
        id: e.id,
        kind: 'EXPENSE',
        name: e.name || t('badges.bill') || 'Expense',
        expectedAmount: e.expectedAmount,
        expectedDate: e.expectedDate,
        poolId: pool?.id || e.poolId || e.categoryId,
        categoryName: pool?.name || null,
        isPrivate: pool?.isPrivate || false,
        rawExpense: {
          id: e.id,
          name: e.name,
          expectedAmount: e.expectedAmount,
          expectedDate: e.expectedDate,
          poolId: pool?.id,
          categoryId: e.categoryId,
          categoryName: pool?.name,
          isPrivate: pool?.isPrivate ?? undefined,
        },
      });
    });

    rawTransferEvents.forEach((e) => {
      const srcPool = pools.find((p) => p.id === e.sourcePoolId);
      const dstPool = pools.find((p) => p.id === e.destinationPoolId);
      const isPriv = Boolean(srcPool?.isPrivate || dstPool?.isPrivate);
      list.push({
        id: e.id,
        kind: 'TRANSFER',
        name: e.name || t('common.transfer') || 'Transfer',
        expectedAmount: e.expectedAmount,
        expectedDate: e.expectedDate,
        sourcePoolId: e.sourcePoolId,
        sourcePoolName: srcPool?.name || e.sourcePoolName || 'Source',
        destinationPoolId: e.destinationPoolId,
        destinationPoolName: dstPool?.name || e.destinationPoolName || 'Destination',
        isPrivate: isPriv,
        rawTransfer: {
          id: e.id,
          name: e.name,
          expectedAmount: e.expectedAmount,
          expectedDate: e.expectedDate,
          sourcePoolId: e.sourcePoolId,
          sourcePoolName: srcPool?.name || e.sourcePoolName,
          destinationPoolId: e.destinationPoolId,
          destinationPoolName: dstPool?.name || e.destinationPoolName,
        },
      });
    });

    return list;
  }, [rawIncomeEvents, rawExpenseEvents, rawTransferEvents, bankAccounts, pools]);

  const filteredUpcomingEvents = useMemo(() => {
    let result = unifiedTimelineEvents;

    if (upcomingKindFilter !== 'ALL') {
      result = result.filter((e) => e.kind === upcomingKindFilter);
    }

    if (upcomingScopeFilter === 'PRIVATE') {
      result = result.filter((e) => e.isPrivate);
    } else if (upcomingScopeFilter === 'SHARED') {
      result = result.filter((e) => !e.isPrivate);
    }

    if (upcomingSearchQuery.trim()) {
      const q = upcomingSearchQuery.toLowerCase().trim();
      result = result.filter((e) => {
        return (
          e.name.toLowerCase().includes(q) ||
          (e.accountName && e.accountName.toLowerCase().includes(q)) ||
          (e.categoryName && e.categoryName.toLowerCase().includes(q)) ||
          (e.sourcePoolName && e.sourcePoolName.toLowerCase().includes(q)) ||
          (e.destinationPoolName && e.destinationPoolName.toLowerCase().includes(q)) ||
          String(e.expectedAmount).includes(q)
        );
      });
    }

    return result.sort((a, b) => {
      let comp = 0;
      if (upcomingSortField === 'date') {
        comp = new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime();
      } else if (upcomingSortField === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (upcomingSortField === 'amount') {
        comp = parseFloat(a.expectedAmount) - parseFloat(b.expectedAmount);
      }
      return upcomingSortOrder === 'asc' ? comp : -comp;
    });
  }, [
    unifiedTimelineEvents,
    upcomingKindFilter,
    upcomingScopeFilter,
    upcomingSearchQuery,
    upcomingSortField,
    upcomingSortOrder,
  ]);

  return { filteredUpcomingEvents };
}
