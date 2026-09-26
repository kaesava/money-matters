import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SegmentedTabs } from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { formatDate, formatIsoDate } from '../../lib/format';
import { LedgerHistoryTab, LedgerTxItem } from '../../components/transactions/LedgerHistoryTab';
import { IncomeSplitsTab } from '../../components/transactions/IncomeSplitsTab';
import { MobilePaydayAllocationRecord } from '../../components/paychecks/MobilePaydayAllocationDetailModal';

type HistoryTab = 'LEDGER' | 'PAYDAYS';
type SortField = 'recordedAt' | 'amount' | 'description';
type SortDir = 'asc' | 'desc';
type PlanSortField = 'createdAt' | 'expectedDate' | 'incomeName' | 'receivingAccount' | 'amount';

export default function TransactionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; search?: string; poolId?: string; bankAccountId?: string }>();
  const { data: session } = authClient.useSession();

  const [activeTab, setActiveTab] = useState<HistoryTab>(
    params.tab === 'payday-allocations' ? 'PAYDAYS' : 'LEDGER'
  );
  const [refreshing, setRefreshing] = useState(false);

  // Tab 1 (Ledger) State
  const [searchQuery, setSearchQuery] = useState(params.search || '');
  const [flowFilter, setFlowFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT' | 'TRANSFER'>('ALL');
  const [selectedPoolId, setSelectedPoolId] = useState<string>(params.poolId || 'ALL');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(params.bankAccountId || 'ALL');
  const [sortField, setSortField] = useState<SortField>('recordedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Tab 2 (Income Splits) State
  const [planSearchQuery, setPlanSearchQuery] = useState('');
  const [selectedPlanBankId, setSelectedPlanBankId] = useState<string>('ALL');
  const [planSortField, setPlanSortField] = useState<PlanSortField>('expectedDate');
  const [planSortDir, setPlanSortDir] = useState<SortDir>('desc');
  const [planPage, setPlanPage] = useState(1);
  const [planPageSize, setPlanPageSize] = useState(15);

  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 500 }, { enabled: !!session?.user });
  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: !!session?.user });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: !!session?.user });
  const allPlansQuery = trpc.listAllAllocationPlans.useQuery(undefined, { enabled: !!session?.user });

  const transactions = transactionsQuery.data ?? [];
  const pools = poolsQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];
  const allocationPlans = (allPlansQuery.data as unknown as MobilePaydayAllocationRecord[]) ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      transactionsQuery.refetch(),
      poolsQuery.refetch(),
      bankAccountsQuery.refetch(),
      allPlansQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const poolMap = useMemo(() => new Map(pools.map((p) => [p.id, p.name])), [pools]);
  const bankMap = useMemo(() => new Map(bankAccounts.map((b) => [b.id, b.name])), [bankAccounts]);

  const mappedTransactions = useMemo<LedgerTxItem[]>(() => {
    return transactions.map((tx) => {
      const isTransfer =
        Boolean(tx.transferGroupId) ||
        tx.transactionType === 'TRANSFER_OUT' ||
        tx.transactionType === 'TRANSFER_IN' ||
        Boolean(tx.note?.startsWith('Transferred') || tx.note?.startsWith('Transfer from') || tx.note?.includes('➔'));

      const effectiveType: 'DEBIT' | 'CREDIT' | 'TRANSFER' = isTransfer
        ? 'TRANSFER'
        : (tx.flowType as 'DEBIT' | 'CREDIT');

      const pName = tx.poolName || (tx.poolId ? poolMap.get(tx.poolId) : undefined) || 'Everyday';
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
      if (selectedBankAccountId !== 'ALL' && tx.bankAccountId !== selectedBankAccountId) return false;
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
        const matched = bankAccounts.find((b) => b.id === selectedPlanBankId || b.name === selectedPlanBankId);
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
        cmp = parseFloat(String(a.totalIncomeAmount || 0)) - parseFloat(String(b.totalIncomeAmount || 0));
      }
      return planSortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredPlans, planSortField, planSortDir]);

  const handleExportCsv = async () => {
    if (sortedTransactions.length === 0) return;
    const headers = ['Date', 'Type', 'Description', 'Category / Pool', 'Source', 'Amount (AUD)'];
    const rows = sortedTransactions.map((tx) => [
      `"${formatDate(tx.recordedAt)}"`,
      `"${tx.transactionType || tx.effectiveType}"`,
      `"${(tx.note || '').replace(/"/g, '""')}"`,
      `"${(tx.poolName || 'Everyday').replace(/"/g, '""')}"`,
      `"${tx.source || 'MANUAL'}"`,
      `"${tx.amount}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    try {
      const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}transactions_${formatIsoDate(new Date())}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export CSV' });
      }
    } catch {
      // Ignored
    }
  };

  const handleExportPlansCsv = async () => {
    if (sortedPlans.length === 0) return;
    const headers = ['Split Date', 'Income Date', 'Income Source', 'Bank Account', 'Total Amount'];
    const rows = sortedPlans.map((p) => [
      `"${formatDate(p.createdAt)}"`,
      `"${formatDate(p.expectedDate || p.createdAt)}"`,
      `"${(p.incomeName || '').replace(/"/g, '""')}"`,
      `"${(p.receivingAccountName || '').replace(/"/g, '""')}"`,
      `"${p.totalIncomeAmount}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    try {
      const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}splits_${formatIsoDate(new Date())}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Splits CSV' });
      }
    } catch {
      // Ignored
    }
  };

  return (
    <AppScreenWrapper
      title={t('transactions.title')}
      scrollable={false}
      infoTooltip={{
        title: t('tooltips.transactions.title'),
        content: t('tooltips.transactions.content'),
      }}
    >
      <View style={styles.container}>
        <SegmentedTabs<HistoryTab>
          tabs={[
            { key: 'LEDGER', label: t('transactions.tabs.transactions') },
            { key: 'PAYDAYS', label: t('transactions.tabs.paydayAllocations') },
          ]}
          activeKey={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'LEDGER' ? (
          <LedgerHistoryTab
            transactions={sortedTransactions}
            isLoading={transactionsQuery.isLoading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setPage(1);
            }}
            flowFilter={flowFilter}
            onFlowFilterChange={setFlowFilter}
            selectedPoolId={selectedPoolId}
            onPoolChange={setSelectedPoolId}
            selectedBankAccountId={selectedBankAccountId}
            onBankChange={setSelectedBankAccountId}
            sortField={sortField}
            sortDir={sortDir}
            onSortFieldChange={setSortField}
            onSortDirChange={setSortDir}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pools={pools}
            bankAccounts={bankAccounts}
            onExportCsv={handleExportCsv}
            onNavigateToPool={(pId) => router.push(`/(app)/categories?poolId=${pId}` as never)}
          />
        ) : (
          <IncomeSplitsTab
            plans={sortedPlans}
            isLoading={allPlansQuery.isLoading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            searchQuery={planSearchQuery}
            onSearchChange={(q) => {
              setPlanSearchQuery(q);
              setPlanPage(1);
            }}
            selectedBankId={selectedPlanBankId}
            onBankChange={setSelectedPlanBankId}
            sortField={planSortField}
            sortDir={planSortDir}
            onSortFieldChange={setPlanSortField}
            onSortDirChange={setPlanSortDir}
            page={planPage}
            pageSize={planPageSize}
            onPageChange={setPlanPage}
            onPageSizeChange={setPlanPageSize}
            bankAccounts={bankAccounts}
            onExportCsv={handleExportPlansCsv}
          />
        )}
      </View>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
