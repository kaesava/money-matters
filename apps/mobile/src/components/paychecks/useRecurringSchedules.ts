import { useMemo } from 'react';
import { IncomeSourceItem } from './IncomeSourceCard';
import { ExpenseSourceItem } from './ExpenseBillCard';

interface UseRecurringSchedulesProps {
  incomeSources: any[];
  expenseSources: any[];
  bankAccounts: any[];
  pools: any[];
  selectedIncomeBankId: string;
  selectedExpensePoolId: string;
  scheduleSearchQuery: string;
  sortField?: 'name' | 'amount' | 'date';
  sortOrder?: 'asc' | 'desc';
}

export function useRecurringSchedules({
  incomeSources,
  expenseSources,
  bankAccounts,
  pools,
  selectedIncomeBankId,
  selectedExpensePoolId,
  scheduleSearchQuery,
  sortField = 'name',
  sortOrder = 'asc',
}: UseRecurringSchedulesProps) {
  const enrichedIncomeSources: IncomeSourceItem[] = useMemo(() => {
    return incomeSources.map((s) => {
      const acct = bankAccounts.find((b) => b.id === s.receivingAccountId);
      return {
        ...s,
        accountName: acct?.name || null,
      };
    });
  }, [incomeSources, bankAccounts]);

  const filteredIncomeSources = useMemo(() => {
    const list = enrichedIncomeSources.filter((s) => {
      if (selectedIncomeBankId !== 'ALL' && s.receivingAccountId !== selectedIncomeBankId) {
        return false;
      }
      if (!scheduleSearchQuery.trim()) return true;
      const q = scheduleSearchQuery.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.accountName && s.accountName.toLowerCase().includes(q)) ||
        String(s.amount).includes(q)
      );
    });

    return list.sort((a, b) => {
      let comp = 0;
      if (sortField === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (sortField === 'amount') {
        comp = parseFloat(a.amount || '0') - parseFloat(b.amount || '0');
      } else if (sortField === 'date') {
        comp = (a.startDate || '').localeCompare(b.startDate || '');
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [enrichedIncomeSources, selectedIncomeBankId, scheduleSearchQuery, sortField, sortOrder]);

  const enrichedExpenseSources: ExpenseSourceItem[] = useMemo(() => {
    return expenseSources.map((s) => {
      const pool = pools.find((p) => p.id === (s.poolId || s.categoryId));
      return {
        ...s,
        poolName: s.poolName || pool?.name || null,
      };
    });
  }, [expenseSources, pools]);

  const filteredExpenseSources = useMemo(() => {
    const list = enrichedExpenseSources.filter((s) => {
      if (selectedExpensePoolId !== 'ALL' && (s.poolId || s.categoryId) !== selectedExpensePoolId) {
        return false;
      }
      if (!scheduleSearchQuery.trim()) return true;
      const q = scheduleSearchQuery.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.poolName && s.poolName.toLowerCase().includes(q)) ||
        (s.categoryName && s.categoryName.toLowerCase().includes(q)) ||
        String(s.amount).includes(q)
      );
    });

    return list.sort((a, b) => {
      let comp = 0;
      if (sortField === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (sortField === 'amount') {
        comp = parseFloat(a.amount || '0') - parseFloat(b.amount || '0');
      } else if (sortField === 'date') {
        comp = (a.startDate || '').localeCompare(b.startDate || '');
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [enrichedExpenseSources, selectedExpensePoolId, scheduleSearchQuery, sortField, sortOrder]);

  return { filteredIncomeSources, filteredExpenseSources };
}
