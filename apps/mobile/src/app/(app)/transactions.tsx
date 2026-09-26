import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  DESIGN_TOKENS,
  MobilePaginationBar,
  SegmentedTabs,
  SearchInput,
  SkeletonCard,
  MobilePoolPicker,
  MobileBankPicker,
  RecordFilterBadge,
  FilterPill,
} from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { formatAUD, formatIsoDate, formatDate } from '../../lib/format';
import { TransactionRow } from '../../components/TransactionRow';
import {
  MobilePaydayAllocationDetailModal,
  MobilePaydayAllocationRecord,
} from '../../components/paychecks/MobilePaydayAllocationDetailModal';

type HistoryTab = 'LEDGER' | 'PAYDAYS';
type SortField = 'recordedAt' | 'amount' | 'categoryName' | 'description';
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

  // Ledger Filter & Sort State
  const [searchQuery, setSearchQuery] = useState(params.search || '');
  const [flowFilter, setFlowFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT' | 'TRANSFER'>('ALL');
  const [selectedPoolId, setSelectedPoolId] = useState<string>(params.poolId || 'ALL');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(params.bankAccountId || 'ALL');
  const [sortField, setSortField] = useState<SortField>('recordedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Payday Allocations / Income Splits Filter & Sort State
  const [planSearchQuery, setPlanSearchQuery] = useState('');
  const [selectedPlanBankId, setSelectedPlanBankId] = useState<string>('ALL');
  const [planSortField, setPlanSortField] = useState<PlanSortField>('expectedDate');
  const [planSortDir, setPlanSortDir] = useState<SortDir>('desc');
  const [planPage, setPlanPage] = useState(1);
  const [planPageSize, setPlanPageSize] = useState(15);

  // Payday allocation inspector modal
  const [selectedAllocation, setSelectedAllocation] = useState<MobilePaydayAllocationRecord | null>(null);

  const transactionsQuery = trpc.listTransactions.useQuery(
    { limit: 500 },
    { enabled: !!session?.user }
  );
  const poolsQuery = trpc.listPools.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const allPlansQuery = trpc.listAllAllocationPlans.useQuery(undefined, {
    enabled: !!session?.user,
  });

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

  // Lookup map for transfer pairs
  const transferGroupMap = useMemo(() => {
    const map = new Map<string, typeof transactions>();
    for (const tx of transactions) {
      if (tx.transferGroupId) {
        const group = map.get(tx.transferGroupId) || [];
        group.push(tx);
        map.set(tx.transferGroupId, group);
      }
    }
    return map;
  }, [transactions]);

  const mappedTransactions = useMemo(() => {
    return transactions.map((tx) => {
      const isTransfer =
        Boolean(tx.transferGroupId) ||
        tx.transactionType === 'TRANSFER_OUT' ||
        tx.transactionType === 'TRANSFER_IN' ||
        tx.note?.startsWith('Transferred') ||
        tx.note?.startsWith('Transfer from') ||
        tx.note?.startsWith('Transfer to') ||
        tx.note?.includes('➔');

      let sourcePoolName: string | undefined;
      let destPoolName: string | undefined;

      if (tx.transferGroupId) {
        const group = transferGroupMap.get(tx.transferGroupId);
        const counterpart = group?.find((other) => other.id !== tx.id);
        if (counterpart) {
          if (tx.flowType === 'DEBIT') {
            sourcePoolName = tx.poolName || (tx.poolId ? poolMap.get(tx.poolId) : undefined) || 'Everyday';
            destPoolName = counterpart.poolName || (counterpart.poolId ? poolMap.get(counterpart.poolId) : undefined) || 'Everyday';
          } else {
            sourcePoolName = counterpart.poolName || (counterpart.poolId ? poolMap.get(counterpart.poolId) : undefined) || 'Everyday';
            destPoolName = tx.poolName || (tx.poolId ? poolMap.get(tx.poolId) : undefined) || 'Everyday';
          }
        }
      }

      const effectiveType: 'DEBIT' | 'CREDIT' | 'TRANSFER' = isTransfer
        ? 'TRANSFER'
        : (tx.flowType as 'DEBIT' | 'CREDIT');

      return {
        ...tx,
        isTransfer,
        effectiveType,
        sourcePoolName,
        destPoolName,
      };
    });
  }, [transactions, poolMap, transferGroupMap]);

  // Filter Ledger
  const filteredTxs = useMemo(() => {
    return mappedTransactions.filter((tx) => {
      const q = searchQuery.toLowerCase().trim();
      if (
        q &&
        !tx.note?.toLowerCase().includes(q) &&
        !tx.poolName?.toLowerCase().includes(q) &&
        !tx.sourcePoolName?.toLowerCase().includes(q) &&
        !tx.destPoolName?.toLowerCase().includes(q) &&
        !String(tx.amount || '').includes(q)
      ) {
        return false;
      }

      if (flowFilter !== 'ALL' && tx.effectiveType !== flowFilter) return false;

      if (selectedPoolId !== 'ALL' && tx.poolId !== selectedPoolId) {
        return false;
      }

      if (selectedBankAccountId !== 'ALL' && tx.bankAccountId !== selectedBankAccountId) {
        return false;
      }

      return true;
    });
  }, [mappedTransactions, searchQuery, flowFilter, selectedPoolId, selectedBankAccountId]);

  const sortedTxs = useMemo(() => {
    return [...filteredTxs].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'recordedAt') {
        comparison =
          new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
      } else if (sortField === 'amount') {
        comparison = parseFloat(a.amount) - parseFloat(b.amount);
      } else if (sortField === 'categoryName') {
        const aName = a.sourcePoolName && a.destPoolName ? `${a.sourcePoolName} ➔ ${a.destPoolName}` : a.poolName || '';
        const bName = b.sourcePoolName && b.destPoolName ? `${b.sourcePoolName} ➔ ${b.destPoolName}` : b.poolName || '';
        comparison = aName.localeCompare(bName);
      } else if (sortField === 'description') {
        comparison = (a.note || '').localeCompare(b.note || '');
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [filteredTxs, sortField, sortDir]);

  const totalPages = Math.ceil(sortedTxs.length / pageSize) || 1;
  const paginatedTxs = useMemo(() => {
    return sortedTxs.slice((page - 1) * pageSize, page * pageSize);
  }, [sortedTxs, page, pageSize]);

  // Filter & Sort Payday Plans
  const filteredPlans = useMemo(() => {
    return allocationPlans.filter((plan) => {
      if (selectedPlanBankId !== 'ALL') {
        const matchedBank = bankAccounts.find((b) => b.id === selectedPlanBankId || b.name === selectedPlanBankId);
        if (matchedBank && plan.receivingAccountName !== matchedBank.name) {
          return false;
        }
      }
      if (planSearchQuery.trim()) {
        const q = planSearchQuery.toLowerCase().trim();
        const incName = (plan.incomeName || '').toLowerCase();
        const bankName = (plan.receivingAccountName || '').toLowerCase();
        const amtStr = String(plan.totalIncomeAmount || '');
        if (!incName.includes(q) && !bankName.includes(q) && !amtStr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allocationPlans, selectedPlanBankId, planSearchQuery, bankAccounts]);

  const sortedPlans = useMemo(() => {
    return [...filteredPlans].sort((a, b) => {
      let comparison = 0;
      if (planSortField === 'expectedDate') {
        comparison = (a.expectedDate || '').localeCompare(b.expectedDate || '');
      } else if (planSortField === 'createdAt') {
        comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      } else if (planSortField === 'incomeName') {
        comparison = (a.incomeName || '').localeCompare(b.incomeName || '');
      } else if (planSortField === 'receivingAccount') {
        comparison = (a.receivingAccountName || '').localeCompare(b.receivingAccountName || '');
      } else if (planSortField === 'amount') {
        comparison = parseFloat(String(a.totalIncomeAmount || 0)) - parseFloat(String(b.totalIncomeAmount || 0));
      }
      return planSortDir === 'asc' ? comparison : -comparison;
    });
  }, [filteredPlans, planSortField, planSortDir]);

  const planTotalPages = Math.ceil(sortedPlans.length / planPageSize) || 1;
  const paginatedPlans = useMemo(() => {
    return sortedPlans.slice((planPage - 1) * planPageSize, planPage * planPageSize);
  }, [sortedPlans, planPage, planPageSize]);

  // Export CSV (Tab 1: Ledger)
  const handleExportCsv = async () => {
    if (sortedTxs.length === 0) return;
    const headers = ['Date', 'Type', 'Description', 'Category / Pool', 'Source', 'Amount (AUD)'];
    const rows = sortedTxs.map((tx) => [
      `"${formatDate(tx.recordedAt)}"`,
      `"${tx.transactionType || tx.effectiveType}"`,
      `"${(tx.note || '').replace(/"/g, '""')}"`,
      `"${(tx.sourcePoolName && tx.destPoolName ? `${tx.sourcePoolName} ➔ ${tx.destPoolName}` : tx.poolName || 'Everyday').replace(/"/g, '""')}"`,
      `"${tx.source || 'MANUAL'}"`,
      `"${tx.amount}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    try {
      const todayStr = formatIsoDate(new Date());
      const fileName = `transactions_export_${todayStr}.csv`;
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const fileUri = `${baseDir}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Transactions CSV',
          UTI: 'public.comma-separated-values-text',
        });
      }
    } catch {
      // Ignored
    }
  };

  // Export CSV (Tab 2: Income Splits)
  const handleExportPlansCsv = async () => {
    if (sortedPlans.length === 0) return;
    const headers = [
      'Income Split Date',
      'Income Date',
      'Income Source',
      'Receiving Bank Account',
      'Total Income Amount',
      'Pool/Category',
      'Allocated Amount',
      'Reasoning',
    ];
    const rows: string[][] = [];

    for (const plan of sortedPlans) {
      const splitDateStr = formatDate(plan.createdAt);
      const incDateStr = formatDate(plan.expectedDate || plan.createdAt);
      const incName = plan.incomeName || 'Income Deposit';
      const bankName = plan.receivingAccountName || 'Main Account';
      const totalAmt = plan.totalIncomeAmount;

      if (plan.lines && plan.lines.length > 0) {
        for (const line of plan.lines) {
          rows.push([
            `"${splitDateStr}"`,
            `"${incDateStr}"`,
            `"${incName.replace(/"/g, '""')}"`,
            `"${bankName.replace(/"/g, '""')}"`,
            `"${totalAmt}"`,
            `"${(line.poolName || 'Unknown').replace(/"/g, '""')}"`,
            `"${line.confirmedAmount || line.proposedAmount || '0'}"`,
            `"${(line.reasoning || '').replace(/"/g, '""')}"`,
          ]);
        }
      } else {
        rows.push([
          `"${splitDateStr}"`,
          `"${incDateStr}"`,
          `"${incName.replace(/"/g, '""')}"`,
          `"${bankName.replace(/"/g, '""')}"`,
          `"${totalAmt}"`,
          '""',
          '""',
          '""',
        ]);
      }
    }

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    try {
      const todayStr = formatIsoDate(new Date());
      const fileName = `money_matters_income_splits_${todayStr}.csv`;
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const fileUri = `${baseDir}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Income Splits CSV',
          UTI: 'public.comma-separated-values-text',
        });
      }
    } catch {
      // Ignored
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const togglePlanSort = (field: PlanSortField) => {
    if (planSortField === field) {
      setPlanSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setPlanSortField(field);
      setPlanSortDir('desc');
    }
  };

  const matchedFilterPool = pools.find((p) => p.id === selectedPoolId);
  const matchedFilterBank = bankAccounts.find((b) => b.id === selectedBankAccountId);

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
        {/* 2-Tab Segment Bar */}
        <SegmentedTabs<HistoryTab>
          tabs={[
            { key: 'LEDGER', label: t('transactions.tabs.transactions') },
            { key: 'PAYDAYS', label: t('transactions.tabs.paydayAllocations') },
          ]}
          activeKey={activeTab}
          onChange={setActiveTab}
        />

        {/* Tab 1: Transactions Ledger */}
        {activeTab === 'LEDGER' && (
          <View style={styles.tabContentWrap}>
            {/* LOCKED TOP HEADER: Search, Filters & Sort Bar */}
            <View style={styles.lockedHeader}>
              {/* Row 1: Search & Download CSV button */}
              <View style={styles.searchRow}>
                <View style={{ flex: 1 }}>
                  <SearchInput
                    placeholder={t('transactions.searchPlaceholder')}
                    value={searchQuery}
                    onChangeText={(val) => {
                      setSearchQuery(val);
                      setPage(1);
                    }}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleExportCsv}
                  style={styles.csvBtn}
                  disabled={sortedTxs.length === 0}
                  accessibilityLabel="Export CSV"
                  accessibilityRole="button"
                >
                  <Feather name="download" size={14} color="#2563eb" />
                  <Text style={styles.csvBtnText}>{t('transactions.csvExport')}</Text>
                </TouchableOpacity>
              </View>

              {/* Active Route Filter Badges */}
              {(selectedPoolId !== 'ALL' || selectedBankAccountId !== 'ALL') && (
                <View style={styles.filterBadgeRow}>
                  {selectedPoolId !== 'ALL' && (
                    <RecordFilterBadge
                      label={matchedFilterPool ? `Pool: ${matchedFilterPool.name}` : `Pool: ${selectedPoolId}`}
                      onClear={() => {
                        setSelectedPoolId('ALL');
                        setPage(1);
                        router.setParams({ poolId: undefined } as never);
                      }}
                    />
                  )}
                  {selectedBankAccountId !== 'ALL' && (
                    <RecordFilterBadge
                      label={matchedFilterBank ? `Bank: ${matchedFilterBank.name}` : `Bank: ${selectedBankAccountId}`}
                      onClear={() => {
                        setSelectedBankAccountId('ALL');
                        setPage(1);
                        router.setParams({ bankAccountId: undefined } as never);
                      }}
                    />
                  )}
                </View>
              )}

              {/* Row 2: Flow Type filter (Clean, no icons) & Interactive Filter Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterPillsRow}
              >
                {(['ALL', 'DEBIT', 'CREDIT', 'TRANSFER'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => {
                      setFlowFilter(f);
                      setPage(1);
                    }}
                    style={[
                      styles.flowChip,
                      flowFilter === f && styles.flowChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.flowChipText,
                        flowFilter === f && styles.flowChipTextActive,
                      ]}
                    >
                      {f === 'ALL'
                        ? t('transactions.filterAll')
                        : f === 'DEBIT'
                        ? t('transactions.filterDebit')
                        : f === 'CREDIT'
                        ? t('transactions.filterCredit')
                        : t('transactions.filterTransfer')}
                    </Text>
                  </TouchableOpacity>
                ))}

                <View style={styles.filterDivider} />

                {/* Reusable Pool Picker */}
                <MobilePoolPicker
                  pools={pools.map((p) => ({
                    id: p.id,
                    name: p.name,
                    poolType: p.poolType,
                  }))}
                  selectedPoolId={selectedPoolId}
                  onSelectPool={(id) => {
                    setSelectedPoolId(id);
                    setPage(1);
                  }}
                  allowAllOption={true}
                  allOptionLabel={t('transactions.allPools')}
                />

                {/* Reusable Bank Account Picker */}
                <MobileBankPicker
                  banks={bankAccounts.map((b) => ({
                    id: b.id,
                    name: b.name,
                    institution: b.bankProvider,
                  }))}
                  selectedBankId={selectedBankAccountId}
                  onSelectBank={(id) => {
                    setSelectedBankAccountId(id);
                    setPage(1);
                  }}
                  allowAllOption={true}
                  allOptionLabel={t('transactions.allBanks')}
                />

                <View style={styles.filterDivider} />

                {/* Sort Toggle Pill */}
                <FilterPill
                  label={`${t('transactions.sortByDate')} ${sortField === 'recordedAt' ? (sortDir === 'asc' ? '▲' : '▼') : ''}`}
                  isActive={sortField === 'recordedAt'}
                  hasChevron={false}
                  onPress={() => toggleSort('recordedAt')}
                />

                <FilterPill
                  label={`${t('transactions.sortByAmount')} ${sortField === 'amount' ? (sortDir === 'asc' ? '▲' : '▼') : ''}`}
                  isActive={sortField === 'amount'}
                  hasChevron={false}
                  onPress={() => toggleSort('amount')}
                />
              </ScrollView>
            </View>

            {/* Scrollable Transactions List */}
            <FlatList
              contentContainerStyle={styles.listContent}
              data={paginatedTxs}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#2563eb"
                />
              }
              renderItem={({ item }) => (
                <TransactionRow
                  amount={item.amount}
                  flowType={item.effectiveType}
                  poolName={item.poolName}
                  categoryName={item.categoryName}
                  sourcePoolName={item.sourcePoolName}
                  destPoolName={item.destPoolName}
                  note={item.note}
                  recordedAt={item.recordedAt}
                  onPress={
                    item.poolId
                      ? () => router.push(`/(app)/categories?poolId=${item.poolId}` as never)
                      : undefined
                  }
                />
              )}
              ListEmptyComponent={
                transactionsQuery.isLoading ? (
                  <View style={{ paddingVertical: 12 }}>
                    <SkeletonCard count={4} />
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Feather name="clock" size={32} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>
                      {t('transactions.noTransactionsFound')}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      {t('transactions.emptySubtitle')}
                    </Text>
                  </View>
                )
              }
              ListFooterComponent={
                filteredTxs.length >= 5 ? (
                  <View style={styles.paginationWrap}>
                    <MobilePaginationBar
                      page={page}
                      totalPages={totalPages}
                      pageSize={pageSize}
                      totalItems={filteredTxs.length}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                    />
                  </View>
                ) : null
              }
            />
          </View>
        )}

        {/* Tab 2: Income Splits Log */}
        {activeTab === 'PAYDAYS' && (
          <View style={styles.tabContentWrap}>
            {/* LOCKED TOP HEADER: Search, Bank Picker & CSV Export */}
            <View style={styles.lockedHeader}>
              <View style={styles.searchRow}>
                <View style={{ flex: 1 }}>
                  <SearchInput
                    placeholder={t('transactions.searchPaydaysPlaceholder')}
                    value={planSearchQuery}
                    onChangeText={(val) => {
                      setPlanSearchQuery(val);
                      setPlanPage(1);
                    }}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleExportPlansCsv}
                  style={styles.csvBtn}
                  disabled={sortedPlans.length === 0}
                  accessibilityLabel="Export CSV"
                  accessibilityRole="button"
                >
                  <Feather name="download" size={14} color="#2563eb" />
                  <Text style={styles.csvBtnText}>{t('transactions.csvExport')}</Text>
                </TouchableOpacity>
              </View>

              {/* Interactive Filter & Sort Pills for Income Splits */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterPillsRow}
              >
                <MobileBankPicker
                  banks={bankAccounts.map((b) => ({
                    id: b.id,
                    name: b.name,
                    institution: b.bankProvider,
                  }))}
                  selectedBankId={selectedPlanBankId}
                  onSelectBank={(id) => {
                    setSelectedPlanBankId(id);
                    setPlanPage(1);
                  }}
                  allowAllOption={true}
                  allOptionLabel={t('transactions.allBanks')}
                />

                <View style={styles.filterDivider} />

                <FilterPill
                  label={`${t('transactions.sortByDate')} ${planSortField === 'expectedDate' ? (planSortDir === 'asc' ? '▲' : '▼') : ''}`}
                  isActive={planSortField === 'expectedDate'}
                  hasChevron={false}
                  onPress={() => togglePlanSort('expectedDate')}
                />

                <FilterPill
                  label={`${t('transactions.sortByAmount')} ${planSortField === 'amount' ? (planSortDir === 'asc' ? '▲' : '▼') : ''}`}
                  isActive={planSortField === 'amount'}
                  hasChevron={false}
                  onPress={() => togglePlanSort('amount')}
                />

                <FilterPill
                  label={`${t('payday.depositSourceName')} ${planSortField === 'incomeName' ? (planSortDir === 'asc' ? '▲' : '▼') : ''}`}
                  isActive={planSortField === 'incomeName'}
                  hasChevron={false}
                  onPress={() => togglePlanSort('incomeName')}
                />
              </ScrollView>
            </View>

            {/* Scrollable Income Splits List */}
            <FlatList
              contentContainerStyle={styles.listContent}
              data={paginatedPlans}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#2563eb"
                />
              }
              renderItem={({ item }) => {
                const isConfirmed = item.status === 'CONFIRMED';
                const totalAmt = parseFloat(item.totalIncomeAmount) || 0;

                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSelectedAllocation(item)}
                    style={styles.paydayCard}
                  >
                    <View style={styles.paydayCardTop}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.badgeRow}>
                          <View
                            style={[
                              styles.statusPill,
                              isConfirmed
                                ? styles.statusPillConfirmed
                                : styles.statusPillSaved,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                isConfirmed
                                  ? styles.statusPillTextConfirmed
                                  : styles.statusPillTextSaved,
                              ]}
                            >
                              {isConfirmed ? t('transactions.statusConfirmed') : t('transactions.statusDraft')}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.paydayName}>{item.incomeName}</Text>

                        {/* Distinct Income Date vs Split Date Tags */}
                        <View style={styles.dateTagsRow}>
                          <View style={styles.dateTag}>
                            <Text style={styles.dateTagLabel}>Payday:</Text>
                            <Text style={styles.dateTagValue}>{formatDate(item.expectedDate)}</Text>
                          </View>
                          <View style={styles.dateTag}>
                            <Text style={styles.dateTagLabel}>Split:</Text>
                            <Text style={styles.dateTagValue}>{formatDate(item.createdAt)}</Text>
                          </View>
                        </View>

                        {item.receivingAccountName && (
                          <Text style={styles.receivingAccountText}>
                            🏦 {item.receivingAccountName}
                          </Text>
                        )}
                      </View>

                      <View style={styles.paydayAmountCol}>
                        <Text style={styles.paydayAmount}>{formatAUD(totalAmt)}</Text>
                        <Text style={styles.paydayLinesCount}>
                          {t('transactions.bucketSplits').replace('{count}', String(item.lines?.length || 0))}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                allPlansQuery.isLoading ? (
                  <View style={{ paddingVertical: 12 }}>
                    <SkeletonCard count={4} />
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Feather name="calendar" size={32} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>
                      {t('transactions.noPaydaysFound')}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      {t('transactions.noPaydaysSubtitle')}
                    </Text>
                  </View>
                )
              }
              ListFooterComponent={
                filteredPlans.length >= 5 ? (
                  <View style={styles.paginationWrap}>
                    <MobilePaginationBar
                      page={planPage}
                      totalPages={planTotalPages}
                      pageSize={planPageSize}
                      totalItems={filteredPlans.length}
                      onPageChange={setPlanPage}
                      onPageSizeChange={setPlanPageSize}
                    />
                  </View>
                ) : null
              }
            />
          </View>
        )}
      </View>

      {/* Payday Allocation / Income Split Detail Modal */}
      <MobilePaydayAllocationDetailModal
        visible={!!selectedAllocation}
        allocation={selectedAllocation}
        onClose={() => setSelectedAllocation(null)}
        onOpenSplitStudio={(incomeEventId) =>
          router.push(`/(app)/paychecks/${incomeEventId}` as never)
        }
      />
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContentWrap: {
    flex: 1,
  },
  lockedHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  csvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  csvBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  filterBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  filterDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 2,
  },
  flowChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  flowChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563eb',
  },
  flowChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  flowChipTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 90,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 30,
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  paginationWrap: {
    marginTop: 14,
  },
  paydayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  paydayCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    marginBottom: 4,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusPillConfirmed: {
    backgroundColor: '#ECFDF5',
  },
  statusPillSaved: {
    backgroundColor: '#FFFBEB',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusPillTextConfirmed: {
    color: '#047857',
  },
  statusPillTextSaved: {
    color: '#92400E',
  },
  paydayName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  dateTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dateTagLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  dateTagValue: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  receivingAccountText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  paydayAmountCol: {
    alignItems: 'flex-end',
  },
  paydayAmount: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#2563eb',
  },
  paydayLinesCount: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
});
