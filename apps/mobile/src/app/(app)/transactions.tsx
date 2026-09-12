import React, { useState } from 'react';
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
import { formatAUD, formatRelativeDate } from '../../lib/format';
import { TransactionRow } from '../../components/TransactionRow';
import {
  MobilePaydayAllocationDetailModal,
  MobilePaydayAllocationRecord,
} from '../../components/paychecks/MobilePaydayAllocationDetailModal';

type HistoryTab = 'LEDGER' | 'PAYDAYS';
type SortField = 'recordedAt' | 'amount' | 'categoryName';
type SortDir = 'asc' | 'desc';

export default function TransactionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; search?: string }>();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<HistoryTab>(
    params.tab === 'payday-allocations' ? 'PAYDAYS' : 'LEDGER'
  );
  const [refreshing, setRefreshing] = useState(false);

  // Ledger Filter State
  const [searchQuery, setSearchQuery] = useState(params.search || '');
  const [flowFilter, setFlowFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT' | 'TRANSFER'>('ALL');
  const [poolTypeFilter, setPoolTypeFilter] = useState<'ALL' | 'EVERYDAY' | 'REGULAR' | 'GOAL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('recordedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Payday allocation inspector modal
  const [selectedAllocation, setSelectedAllocation] = useState<MobilePaydayAllocationRecord | null>(null);

  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 500 });
  const poolsQuery = trpc.listPools.useQuery();
  const allPlansQuery = trpc.listAllAllocationPlans.useQuery();

  const transactions = transactionsQuery.data ?? [];
  const pools = poolsQuery.data ?? [];
  const allocationPlans = allPlansQuery.data ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      transactionsQuery.refetch(),
      poolsQuery.refetch(),
      allPlansQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  // Filter Ledger
  const filteredTxs = transactions.filter((tx) => {
    const q = searchQuery.toLowerCase().trim();
    if (
      q &&
      !tx.note?.toLowerCase().includes(q) &&
      !tx.poolName?.toLowerCase().includes(q) &&
      !String(tx.amount || '').includes(q)
    ) {
      return false;
    }

    if (flowFilter !== 'ALL' && tx.flowType !== flowFilter) return false;

    if (poolTypeFilter !== 'ALL') {
      const pool = pools.find((p) => p.id === tx.poolId);
      if (!pool || pool.poolType !== poolTypeFilter) return false;
    }

    return true;
  });

  const sortedTxs = [...filteredTxs].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'recordedAt') {
      comparison =
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
    } else if (sortField === 'amount') {
      comparison = parseFloat(a.amount) - parseFloat(b.amount);
    } else if (sortField === 'categoryName') {
      comparison = (a.poolName || '').localeCompare(b.poolName || '');
    }
    return sortDir === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedTxs.length / pageSize) || 1;
  const paginatedTxs = sortedTxs.slice((page - 1) * pageSize, page * pageSize);

  const handleExportCsv = async () => {
    if (sortedTxs.length === 0) return;
    const headers = ['Date', 'Pool', 'Flow', 'Amount', 'Note'];
    const rows = sortedTxs.map((tx) => [
      `"${new Date(tx.recordedAt).toISOString().split('T')[0]}"`,
      `"${tx.poolName || 'Everyday'}"`,
      `"${tx.flowType}"`,
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

  return (
    <MobileScreenWrapper
      title={t('nav.history') || 'History'}
      user={session?.user}
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
              Transactions Ledger
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
              Payday Allocations
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
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
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

                {/* Flow Filters */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  {(['ALL', 'DEBIT', 'CREDIT', 'TRANSFER'] as const).map(
                    (f) => (
                      <TouchableOpacity
                        key={f}
                        onPress={() => setFlowFilter(f)}
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
                            ? 'All Flows'
                            : f === 'DEBIT'
                            ? '💸 Expenses'
                            : f === 'CREDIT'
                            ? '💰 Income'
                            : '⚡ Transfers'}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>
              </View>
            }
            renderItem={({ item }) => (
              <TransactionRow
                amount={item.amount}
                flowType={item.flowType as any}
                poolName={item.poolName}
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
                  <Text style={styles.emptyTitle}>No Transactions Found</Text>
                  <Text style={styles.emptySubtitle}>
                    Recorded expenses, deposits, and transfers will appear here.
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
            data={allocationPlans}
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
                  onPress={() => setSelectedAllocation(item as unknown as MobilePaydayAllocationRecord)}
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
                    </View>

                    <View style={styles.paydayAmountCol}>
                      <Text style={styles.paydayAmount}>{formatAUD(totalAmt)}</Text>
                      <Text style={styles.paydayLinesCount}>
                        {item.lines?.length || 0} bucket splits
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
                  <Text style={styles.emptyTitle}>No Payday Plans Yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Run your first income split on upcoming paychecks to see allocation logs.
                  </Text>
                </View>
              )
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
    gap: 10,
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
    gap: 8,
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
