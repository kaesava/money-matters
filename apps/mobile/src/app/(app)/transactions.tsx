import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { SegmentedTabs } from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { LedgerHistoryTab } from '../../components/transactions/LedgerHistoryTab';
import { IncomeSplitsTab } from '../../components/transactions/IncomeSplitsTab';
import { MobilePaydayAllocationRecord } from '../../components/paychecks/MobilePaydayAllocationDetailModal';
import { useTransactionsExport } from '../../components/transactions/hooks/useTransactionsExport';
import {
  useTransactionsFilter,
  SortField,
  SortDir,
  PlanSortField,
} from '../../components/transactions/hooks/useTransactionsFilter';
import { SpendingTimeframe } from '@money-matters/types';

type HistoryTab = 'LEDGER' | 'PAYDAYS';

export default function TransactionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tab?: string;
    search?: string;
    poolId?: string;
    bankAccountId?: string;
  }>();
  const { data: session } = authClient.useSession();

  const [activeTab, setActiveTab] = useState<HistoryTab>(
    params.tab === 'payday-allocations' ? 'PAYDAYS' : 'LEDGER'
  );
  const [refreshing, setRefreshing] = useState(false);

  // Tab 1 (Ledger) State
  const [searchQuery, setSearchQuery] = useState(params.search || '');
  const [flowFilter, setFlowFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT' | 'TRANSFER'>('ALL');
  const [selectedPoolId, setSelectedPoolId] = useState<string>(params.poolId || 'ALL');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(
    params.bankAccountId || 'ALL'
  );
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
  const [timeframe, setTimeframe] = useState<SpendingTimeframe>('90D');
  const [planTimeframe, setPlanTimeframe] = useState<SpendingTimeframe>('90D');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [debouncedPlanSearchQuery, setDebouncedPlanSearchQuery] = useState(planSearchQuery);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPlanSearchQuery(planSearchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [planSearchQuery]);

  const transactionsQuery = trpc.listTransactions.useQuery(
    { limit: 500 },
    { enabled: !!session?.user }
  );
  const spendingAnalyticsQuery = trpc.getSpendingAnalytics.useQuery(
    {
      timeframe,
      envelopeId: selectedPoolId !== 'ALL' ? selectedPoolId : undefined,
      bankAccountId: selectedBankAccountId !== 'ALL' ? selectedBankAccountId : undefined,
      searchQuery: debouncedSearchQuery.trim().length >= 2 ? debouncedSearchQuery.trim() : undefined,
      flowType: flowFilter,
    },
    { enabled: !!session?.user && activeTab === 'LEDGER' }
  );
  const incomeSplitAnalyticsQuery = trpc.getIncomeSplitAnalytics.useQuery(
    {
      timeframe: planTimeframe,
      bankAccountId: selectedPlanBankId !== 'ALL' ? selectedPlanBankId : undefined,
      searchQuery: debouncedPlanSearchQuery.trim().length >= 2 ? debouncedPlanSearchQuery.trim() : undefined,
    },
    { enabled: !!session?.user && activeTab === 'PAYDAYS' }
  );
  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: !!session?.user });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const allPlansQuery = trpc.listAllAllocationPlans.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const transactions = transactionsQuery.data ?? [];
  const pools = poolsQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];
  const allocationPlans =
    (allPlansQuery.data as unknown as MobilePaydayAllocationRecord[]) ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      transactionsQuery.refetch(),
      spendingAnalyticsQuery.refetch(),
      incomeSplitAnalyticsQuery.refetch(),
      poolsQuery.refetch(),
      bankAccountsQuery.refetch(),
      allPlansQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const { sortedTransactions, sortedPlans } = useTransactionsFilter({
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
  });

  const { exportLedgerCsv, exportPlansCsv } = useTransactionsExport();

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
            onExportCsv={() => exportLedgerCsv(sortedTransactions)}
            onNavigateToPool={(pId) => router.push(`/(app)/envelopes?poolId=${pId}` as Href)}
            spendingAnalytics={spendingAnalyticsQuery.data}
            isAnalyticsLoading={spendingAnalyticsQuery.isLoading}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
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
            onExportCsv={() => exportPlansCsv(sortedPlans)}
            incomeSplitAnalytics={incomeSplitAnalyticsQuery.data}
            isAnalyticsLoading={incomeSplitAnalyticsQuery.isLoading}
            timeframe={planTimeframe}
            onTimeframeChange={setPlanTimeframe}
          />
        )}
      </View>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
