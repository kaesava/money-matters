import { useMemo } from 'react';
import { LedgerTxItem } from '../LedgerHistoryTab';
import { MobilePaydayAllocationRecord } from '../../paychecks/MobilePaydayAllocationDetailModal';

export type SortField = 'recordedAt' | 'amount' | 'description';
export type SortDir = 'asc' | 'desc';
export type PlanSortField =
  | 'createdAt'
  | 'expectedDate'
  | 'incomeName'
  | 'receivingAccount'
  | 'amount';

interface UseTransactionsFilterProps {
  transactions: any[];
  pools: Array<{ id: string; name: string }>;
  bankAccounts: Array<{ id: string; name: string }>;
  allocationPlans: MobilePaydayAllocationRecord[];
  searchQuery: string;
  flowFilter: 'ALL' | 'DEBIT' | 'CREDIT' | 'TRANSFER';
  selectedPoolId: string;
  selectedBankAccountId: string;
  sortField: SortField;
  sortDir: SortDir;
  planSearchQuery: string;
  selectedPlanBankId: string;
  planSortField: PlanSortField;
  planSortDir: SortDir;
}

export function useTransactionsFilter({
  transactions,
  pools,
  bankAccounts,
  allocationPlans,
  searchQuery,
  flowFilter,
  selectedPoolId,
  selectedBankAccountId,
  sortField,
  sortDir,
  planSearchQuery,
  selectedPlanBankId,
  planSortField,
  planSortDir,
}: UseTransactionsFilterProps) {
  const poolMap = useMemo(() => new Map(pools.map((p) => [p.id, p.name])), [pools]);
  const bankMap = useMemo(() => new Map(bankAccounts.map((b) => [b.id, b.name])), [bankAccounts]);

  const mappedTransactions = useMemo<LedgerTxItem[]>(() => {
    return transactions.map((tx) => {
      const isTransfer =
        Boolean(tx.transferGroupId) ||
        tx.transactionType === 'TRANSFER_OUT' ||
        tx.transactionType === 'TRANSFER_IN' ||
        Boolean(
          tx.note?.startsWith('Transferred') ||
            tx.note?.startsWith('Transfer from') ||
            tx.note?.includes('➔')
        );

      const effectiveType: 'DEBIT' | 'CREDIT' | 'TRANSFER' = isTransfer
        ? 'TRANSFER'
        : (tx.flowType as 'DEBIT' | 'CREDIT');

      const pName =
        tx.poolName || (tx.poolId ? poolMap.get(tx.poolId) : undefined) || 'Everyday';
      const bName = tx.bankAccountId ? bankMap.get(tx.bankAccountId) : undefined;

      return {
        id: tx.id,
        amount: tx.amount,
        recordedAt: tx.recordedAt,
        note: tx.note,
        transactionType: tx.transactionType,
        flowType: (tx.flowType as 'DEBIT' | 'CREDIT') || 'DEBIT',
        effectiveType,
        isTransfer,
        poolId: tx.poolId,
        poolName: pName,
        categoryId: tx.categoryId,
        categoryName: tx.categoryName,
        bankAccountId: tx.bankAccountId,
        bankAccountName: bName,
        source: tx.source,
      };
    });
  }, [transactions, poolMap, bankMap]);

  const filteredTransactions = useMemo(() => {
    return mappedTransactions.filter((tx) => {
      const q = searchQuery.toLowerCase().trim();
      if (
        q &&
        !tx.note?.toLowerCase().includes(q) &&
        !tx.poolName?.toLowerCase().includes(q) &&
        !tx.categoryName?.toLowerCase().includes(q) &&
        !String(tx.amount || '').includes(q)
      ) {
        return false;
      }
      if (flowFilter !== 'ALL' && tx.effectiveType !== flowFilter) return false;
      if (selectedPoolId !== 'ALL' && tx.poolId !== selectedPoolId) return false;
      if (selectedBankAccountId !== 'ALL' && tx.bankAccountId !== selectedBankAccountId)
        return false;
      return true;
    });
  }, [mappedTransactions, searchQuery, flowFilter, selectedPoolId, selectedBankAccountId]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'recordedAt') {
        cmp = new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
      } else if (sortField === 'amount') {
        cmp = parseFloat(a.amount) - parseFloat(b.amount);
      } else if (sortField === 'description') {
        cmp = (a.note || a.poolName || '').localeCompare(b.note || b.poolName || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredTransactions, sortField, sortDir]);

  const filteredPlans = useMemo(() => {
    return allocationPlans.filter((plan) => {
      if (selectedPlanBankId !== 'ALL') {
        const matched = bankAccounts.find(
          (b) => b.id === selectedPlanBankId || b.name === selectedPlanBankId
        );
        if (matched && plan.receivingAccountName !== matched.name) return false;
      }
      if (planSearchQuery.trim()) {
        const q = planSearchQuery.toLowerCase().trim();
        const incName = (plan.incomeName || '').toLowerCase();
        const bName = (plan.receivingAccountName || '').toLowerCase();
        const amt = String(plan.totalIncomeAmount || '');
        if (!incName.includes(q) && !bName.includes(q) && !amt.includes(q)) return false;
      }
      return true;
    });
  }, [allocationPlans, selectedPlanBankId, planSearchQuery, bankAccounts]);

  const sortedPlans = useMemo(() => {
    return [...filteredPlans].sort((a, b) => {
      let cmp = 0;
      if (planSortField === 'expectedDate') {
        cmp = (a.expectedDate || '').localeCompare(b.expectedDate || '');
      } else if (planSortField === 'createdAt') {
        cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      } else if (planSortField === 'incomeName') {
        cmp = (a.incomeName || '').localeCompare(b.incomeName || '');
      } else if (planSortField === 'receivingAccount') {
        cmp = (a.receivingAccountName || '').localeCompare(b.receivingAccountName || '');
      } else if (planSortField === 'amount') {
        cmp =
          parseFloat(String(a.totalIncomeAmount || 0)) -
          parseFloat(String(b.totalIncomeAmount || 0));
      }
      return planSortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredPlans, planSortField, planSortDir]);

  return { sortedTransactions, sortedPlans };
}
