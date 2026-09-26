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
}

export function useRecurringSchedules({
  incomeSources,
  expenseSources,
  bankAccounts,
  pools,
  selectedIncomeBankId,
  selectedExpensePoolId,
  scheduleSearchQuery,
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
    return enrichedIncomeSources.filter((s) => {
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
  }, [enrichedIncomeSources, selectedIncomeBankId, scheduleSearchQuery]);

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
    return enrichedExpenseSources.filter((s) => {
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
  }, [enrichedExpenseSources, selectedExpensePoolId, scheduleSearchQuery]);

  return { filteredIncomeSources, filteredExpenseSources };
}
