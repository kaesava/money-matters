import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  MobileScreenWrapper,
  MobilePaginationBar,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { formatAUD, formatRelativeDate, formatIsoDate } from '../../lib/format';
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
  const utils = trpc.useUtils();

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

  // Payday Allocations Filter & Sort State
  const [planSearchQuery, setPlanSearchQuery] = useState('');
  const [selectedPlanBankId, setSelectedPlanBankId] = useState<string>('ALL');
  const [planSortField, setPlanSortField] = useState<PlanSortField>('expectedDate');
  const [planSortDir, setPlanSortDir] = useState<SortDir>('desc');
  const [planPage, setPlanPage] = useState(1);
  const [planPageSize, setPlanPageSize] = useState(15);

  // Payday allocation inspector modal
  const [selectedAllocation, setSelectedAllocation] = useState<MobilePaydayAllocationRecord | null>(null);

  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 500 });
  const poolsQuery = trpc.listPools.useQuery();
  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const allPlansQuery = trpc.listAllAllocationPlans.useQuery();

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

  // Build a lookup map for transfer pairs by transferGroupId
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
        const matchedBank = bankAccounts.find((b) => b.id === selectedPlanBankId);
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

  const handleExportCsv = async () => {
    if (sortedTxs.length === 0) return;
    const headers = ['Date', 'Pool / Transfer', 'Flow', 'Amount', 'Note'];
    const rows = sortedTxs.map((tx) => [
      `"${formatIsoDate(tx.recordedAt)}"`,
      `"${tx.sourcePoolName && tx.destPoolName ? `${tx.sourcePoolName} ➔ ${tx.destPoolName}` : tx.poolName || 'Everyday'}"`,
      `"${tx.effectiveType}"`,
      `"${tx.amount}"`,
      `"${(tx.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    try {
      await Share.share({
        message: csvContent,
        title: 'Transactions Export.csv',
      });
    } catch {
      // Ignored
    }
  };

  const handleExportPlansCsv = async () => {
    if (sortedPlans.length === 0) return;
    const headers = ['Expected Date', 'Income Source', 'Receiving Account', 'Total Amount', 'Status'];
    const rows = sortedPlans.map((p) => [
      `"${p.expectedDate || ''}"`,
      `"${(p.incomeName || '').replace(/"/g, '""')}"`,
      `"${(p.receivingAccountName || '').replace(/"/g, '""')}"`,
      `"${p.totalIncomeAmount || '0'}"`,
      `"${p.status || 'CONFIRMED'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    try {
      await Share.share({
        message: csvContent,
        title: 'Payday Allocations Export.csv',
      });
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

  return (
    <MobileScreenWrapper
      title={t('transactions.title') || 'History'}
      user={session?.user}
      scrollable={false}
      onNavigateHome={() => router.push('/(app)/home')}
      onNavigateCategories={() => router.push('/(app)/categories')}
      onNavigateSettings={() => router.push('/(app)/settings')}
    >
      <View style={styles.container}>
        {/* 2-Tab Segment Bar */}
        <View style={styles.tabSegmentBar}>
          <TouchableOpacity
            onPress={() => setActiveTab('LEDGER')}
            style={[
              styles.tabSegmentBtn,
              activeTab === 'LEDGER' && styles.tabSegmentBtnActive,
            ]}
          >
            <Feather
              name="list"
              size={14}
              color={activeTab === 'LEDGER' ? '#1B2B4B' : '#64748B'}
            />
            <Text
              style={[
                styles.tabSegmentText,
                activeTab === 'LEDGER' && styles.tabSegmentTextActive,
              ]}
            >
              {t('transactions.ledgerTab') || 'Transactions'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('PAYDAYS')}
            style={[
              styles.tabSegmentBtn,
              activeTab === 'PAYDAYS' && styles.tabSegmentBtnActive,
            ]}
          >
            <Feather
              name="calendar"
              size={14}
              color={activeTab === 'PAYDAYS' ? '#1B2B4B' : '#64748B'}
            />
            <Text
              style={[
                styles.tabSegmentText,
                activeTab === 'PAYDAYS' && styles.tabSegmentTextActive,
              ]}
            >
              {t('transactions.paydayTab') || 'Payday Allocations'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Transactions Ledger */}
        {activeTab === 'LEDGER' && (
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
            ListHeaderComponent={
              <View style={styles.filterSection}>
                {/* Search & CSV row */}
                <View style={styles.searchRow}>
                  <View style={styles.searchWrap}>
                    <Feather name="search" size={16} color="#94A3B8" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={t('transactions.searchPlaceholder') || 'Search transactions...'}
                      value={searchQuery}
                      onChangeText={(val) => {
                        setSearchQuery(val);
                        setPage(1);
                      }}
                      placeholderTextColor="#94A3B8"
                    />
                    {searchQuery ? (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Feather name="x" size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    onPress={handleExportCsv}
                    style={styles.csvBtn}
                  >
                    <Feather name="download" size={14} color="#2563eb" />
                    <Text style={styles.csvBtnText}>CSV</Text>
                  </TouchableOpacity>
                </View>

                {/* Flow Filter Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  {(['ALL', 'DEBIT', 'CREDIT', 'TRANSFER'] as const).map(
                    (f) => (
                      <TouchableOpacity
                        key={f}
                        onPress={() => {
                          setFlowFilter(f);
                          setPage(1);
                        }}
                        style={[
                          styles.filterChip,
                          flowFilter === f && styles.filterChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            flowFilter === f && styles.filterChipTextActive,
                          ]}
                        >
                          {f === 'ALL'
                            ? t('transactions.filterAll') || 'All Flows'
                            : f === 'DEBIT'
                            ? `💸 ${t('transactions.filterDebit') || 'Expenses'}`
                            : f === 'CREDIT'
                            ? `💰 ${t('transactions.filterCredit') || 'Income'}`
                            : `⚡ ${t('transactions.filterTransfer') || 'Transfers'}`}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>

                {/* Specific Pool Filter Chips */}
                {pools.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedPoolId('ALL');
                        setPage(1);
                      }}
                      style={[
                        styles.filterChipSecondary,
                        selectedPoolId === 'ALL' && styles.filterChipSecondaryActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipSecondaryText,
                          selectedPoolId === 'ALL' && styles.filterChipSecondaryTextActive,
                        ]}
                      >
                        {t('transactions.allPools') || 'All Pools'}
                      </Text>
                    </TouchableOpacity>

                    {pools.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => {
                          setSelectedPoolId(p.id);
                          setPage(1);
                        }}
                        style={[
                          styles.filterChipSecondary,
                          selectedPoolId === p.id && styles.filterChipSecondaryActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipSecondaryText,
                            selectedPoolId === p.id && styles.filterChipSecondaryTextActive,
                          ]}
                        >
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {/* Bank Account Filter Chips */}
                {bankAccounts.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedBankAccountId('ALL');
                        setPage(1);
                      }}
                      style={[
                        styles.filterChipSecondary,
                        selectedBankAccountId === 'ALL' && styles.filterChipSecondaryActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipSecondaryText,
                          selectedBankAccountId === 'ALL' && styles.filterChipSecondaryTextActive,
                        ]}
                      >
                        {t('transactions.allBanks') || 'All Bank Accounts'}
                      </Text>
                    </TouchableOpacity>

                    {bankAccounts.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => {
                          setSelectedBankAccountId(b.id);
                          setPage(1);
                        }}
                        style={[
                          styles.filterChipSecondary,
                          selectedBankAccountId === b.id && styles.filterChipSecondaryActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipSecondaryText,
                            selectedBankAccountId === b.id && styles.filterChipSecondaryTextActive,
                          ]}
                        >
                          🏦 {b.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {/* Sort Bar */}
                <View style={styles.sortBar}>
                  <Text style={styles.sortLabel}>
                    {t('transactions.sortLabel') || 'Sort:'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => toggleSort('recordedAt')}
                    style={[styles.sortBtn, sortField === 'recordedAt' && styles.sortBtnActive]}
                  >
                    <Text style={[styles.sortBtnText, sortField === 'recordedAt' && styles.sortBtnTextActive]}>
                      {t('transactions.sortByDate') || 'Date'} {sortField === 'recordedAt' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => toggleSort('amount')}
                    style={[styles.sortBtn, sortField === 'amount' && styles.sortBtnActive]}
                  >
                    <Text style={[styles.sortBtnText, sortField === 'amount' && styles.sortBtnTextActive]}>
                      {t('transactions.sortByAmount') || 'Amount'} {sortField === 'amount' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => toggleSort('categoryName')}
                    style={[styles.sortBtn, sortField === 'categoryName' && styles.sortBtnActive]}
                  >
                    <Text style={[styles.sortBtnText, sortField === 'categoryName' && styles.sortBtnTextActive]}>
                      {t('transactions.sortByCategory') || 'Pool'} {sortField === 'categoryName' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
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
              />
            )}
            ListEmptyComponent={
              transactionsQuery.isLoading ? (
                <ActivityIndicator color="#2563eb" style={{ marginVertical: 40 }} />
              ) : (
                <View style={styles.emptyContainer}>
                  <Feather name="clock" size={32} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>
                    {t('transactions.noTransactionsFound') || 'No Transactions Found'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {t('transactions.emptySubtitle') || 'Recorded expenses, deposits, and transfers will appear here.'}
                  </Text>
                </View>
              )
            }
            ListFooterComponent={
              totalPages > 1 ? (
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
        )}

        {/* Tab 2: Payday Allocations Log */}
        {activeTab === 'PAYDAYS' && (
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
            ListHeaderComponent={
              <View style={styles.filterSection}>
                {/* Search & Export Row */}
                <View style={styles.searchRow}>
                  <View style={styles.searchWrap}>
                    <Feather name="search" size={16} color="#94A3B8" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={t('transactions.searchPaydaysPlaceholder') || 'Search income or bank account...'}
                      value={planSearchQuery}
                      onChangeText={(val) => {
                        setPlanSearchQuery(val);
                        setPlanPage(1);
                      }}
                      placeholderTextColor="#94A3B8"
                    />
                    {planSearchQuery ? (
                      <TouchableOpacity onPress={() => setPlanSearchQuery('')}>
                        <Feather name="x" size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    onPress={handleExportPlansCsv}
                    style={styles.csvBtn}
                  >
                    <Feather name="download" size={14} color="#2563eb" />
                    <Text style={styles.csvBtnText}>CSV</Text>
                  </TouchableOpacity>
                </View>

                {/* Bank Account Filter Chips */}
                {bankAccounts.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedPlanBankId('ALL');
                        setPlanPage(1);
                      }}
                      style={[
                        styles.filterChipSecondary,
                        selectedPlanBankId === 'ALL' && styles.filterChipSecondaryActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipSecondaryText,
                          selectedPlanBankId === 'ALL' && styles.filterChipSecondaryTextActive,
                        ]}
                      >
                        {t('transactions.allBanks') || 'All Bank Accounts'}
                      </Text>
                    </TouchableOpacity>

                    {bankAccounts.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => {
                          setSelectedPlanBankId(b.id);
                          setPlanPage(1);
                        }}
                        style={[
                          styles.filterChipSecondary,
                          selectedPlanBankId === b.id && styles.filterChipSecondaryActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipSecondaryText,
                            selectedPlanBankId === b.id && styles.filterChipSecondaryTextActive,
                          ]}
                        >
                          🏦 {b.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {/* Sort Bar */}
                <View style={styles.sortBar}>
                  <Text style={styles.sortLabel}>
                    {t('transactions.sortLabel') || 'Sort:'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => togglePlanSort('expectedDate')}
                    style={[styles.sortBtn, planSortField === 'expectedDate' && styles.sortBtnActive]}
                  >
                    <Text style={[styles.sortBtnText, planSortField === 'expectedDate' && styles.sortBtnTextActive]}>
                      {t('transactions.sortByDate') || 'Date'} {planSortField === 'expectedDate' ? (planSortDir === 'asc' ? '▲' : '▼') : ''}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => togglePlanSort('amount')}
                    style={[styles.sortBtn, planSortField === 'amount' && styles.sortBtnActive]}
                  >
                    <Text style={[styles.sortBtnText, planSortField === 'amount' && styles.sortBtnTextActive]}>
                      {t('transactions.sortByAmount') || 'Amount'} {planSortField === 'amount' ? (planSortDir === 'asc' ? '▲' : '▼') : ''}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => togglePlanSort('incomeName')}
                    style={[styles.sortBtn, planSortField === 'incomeName' && styles.sortBtnActive]}
                  >
                    <Text style={[styles.sortBtnText, planSortField === 'incomeName' && styles.sortBtnTextActive]}>
                      {t('payday.depositSourceName') || 'Income'} {planSortField === 'incomeName' ? (planSortDir === 'asc' ? '▲' : '▼') : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
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
                            {isConfirmed ? 'Confirmed ✓' : 'Draft Saved 💾'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.paydayName}>{item.incomeName}</Text>
                      <Text style={styles.paydayDate}>{item.expectedDate}</Text>
                      {item.receivingAccountName && (
                        <Text style={styles.receivingAccountText}>
                          🏦 {item.receivingAccountName}
                        </Text>
                      )}
                    </View>

                    <View style={styles.paydayAmountCol}>
                      <Text style={styles.paydayAmount}>{formatAUD(totalAmt)}</Text>
                      <Text style={styles.paydayLinesCount}>
                        {t('transactions.bucketSplits', { count: item.lines?.length || 0 }) ||
                          `${item.lines?.length || 0} bucket splits`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              allPlansQuery.isLoading ? (
                <ActivityIndicator color="#2563eb" style={{ marginVertical: 40 }} />
              ) : (
                <View style={styles.emptyContainer}>
                  <Feather name="calendar" size={32} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>
                    {t('transactions.noPaydaysFound') || 'No Payday Plans Yet'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {t('transactions.noPaydaysSubtitle') ||
                      'Run your first income split on upcoming paychecks to see allocation logs.'}
                  </Text>
                </View>
              )
            }
            ListFooterComponent={
              planTotalPages > 1 ? (
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
        )}
      </View>

      {/* Payday Allocation Detail Modal */}
      <MobilePaydayAllocationDetailModal
        visible={!!selectedAllocation}
        allocation={selectedAllocation}
        onClose={() => setSelectedAllocation(null)}
        onOpenSplitStudio={(incomeEventId) =>
          router.push(`/(app)/paychecks/${incomeEventId}` as never)
        }
      />
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabSegmentBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    gap: 4,
  },
  tabSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabSegmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  tabSegmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabSegmentTextActive: {
    color: '#1B2B4B',
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  filterSection: {
    gap: 8,
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1B2B4B',
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
  chipsRow: {
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  filterChipSecondary: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipSecondaryActive: {
    backgroundColor: '#1B2B4B',
    borderColor: '#1B2B4B',
  },
  filterChipSecondaryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipSecondaryTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  sortBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  sortBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  sortBtnTextActive: {
    color: '#1D4ED8',
    fontWeight: '800',
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
  paydayDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  receivingAccountText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
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
