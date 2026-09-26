import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SearchInput, MobilePaginationBar, SkeletonCard, RecordFilterBadge } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { TransactionRow } from '../TransactionRow';
import { HistoryFilterSheet } from './HistoryFilterSheet';
import { TransactionDetailSheet, TransactionDetailRecord } from './TransactionDetailSheet';

export interface LedgerTxItem {
  id: string;
  amount: string;
  recordedAt: string | Date;
  note?: string | null;
  transactionType?: string | null;
  flowType: 'DEBIT' | 'CREDIT';
  effectiveType: 'DEBIT' | 'CREDIT' | 'TRANSFER';
  isTransfer: boolean;
  poolId?: string | null;
  poolName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  bankAccountId?: string | null;
  bankAccountName?: string | null;
  source?: string | null;
}

interface LedgerHistoryTabProps {
  transactions: LedgerTxItem[];
  isLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  flowFilter: 'ALL' | 'DEBIT' | 'CREDIT' | 'TRANSFER';
  onFlowFilterChange: (f: 'ALL' | 'DEBIT' | 'CREDIT' | 'TRANSFER') => void;
  selectedPoolId: string;
  onPoolChange: (id: string) => void;
  selectedBankAccountId: string;
  onBankChange: (id: string) => void;
  sortField: 'recordedAt' | 'amount' | 'description';
  sortDir: 'asc' | 'desc';
  onSortFieldChange: (field: 'recordedAt' | 'amount' | 'description') => void;
  onSortDirChange: (dir: 'asc' | 'desc') => void;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  pools: Array<{ id: string; name: string }>;
  bankAccounts: Array<{ id: string; name: string }>;
  onExportCsv: () => void;
  onNavigateToPool: (poolId: string) => void;
}

export function LedgerHistoryTab({
  transactions,
  isLoading,
  refreshing,
  onRefresh,
  searchQuery,
  onSearchChange,
  flowFilter,
  onFlowFilterChange,
  selectedPoolId,
  onPoolChange,
  selectedBankAccountId,
  onBankChange,
  sortField,
  sortDir,
  onSortFieldChange,
  onSortDirChange,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pools,
  bankAccounts,
  onExportCsv,
  onNavigateToPool,
}: LedgerHistoryTabProps) {
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [detailTx, setDetailTx] = useState<TransactionDetailRecord | null>(null);

  const activeCount =
    (flowFilter !== 'ALL' ? 1 : 0) +
    (selectedPoolId !== 'ALL' ? 1 : 0) +
    (selectedBankAccountId !== 'ALL' ? 1 : 0);

  const totalPages = Math.ceil(transactions.length / pageSize) || 1;
  const paginatedTxs = transactions.slice((page - 1) * pageSize, page * pageSize);

  const matchedPool = pools.find((p) => p.id === selectedPoolId);
  const matchedBank = bankAccounts.find((b) => b.id === selectedBankAccountId);

  return (
    <View style={styles.container}>
      {/* Search, Filter Button & Export CSV */}
      <View style={styles.lockedHeader}>
        <View style={styles.controlsRow}>
          <View style={{ flex: 1 }}>
            <SearchInput
              placeholder={t('transactions.searchPlaceholder')}
              value={searchQuery}
              onChangeText={onSearchChange}
            />
          </View>

          <TouchableOpacity
            style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]}
            onPress={() => setFilterSheetVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="sliders" size={15} color={activeCount > 0 ? '#2563eb' : '#64748B'} />
            <Text style={[styles.filterBtnText, activeCount > 0 && styles.filterBtnTextActive]}>
              {t('common.filter')}
              {activeCount > 0 ? ` (${activeCount})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onExportCsv}
            style={styles.csvBtn}
            disabled={transactions.length === 0}
            activeOpacity={0.7}
          >
            <Feather name="download" size={14} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Active Route Badges */}
        {(selectedPoolId !== 'ALL' || selectedBankAccountId !== 'ALL') && (
          <View style={styles.badgeRow}>
            {selectedPoolId !== 'ALL' && (
              <RecordFilterBadge
                label={matchedPool ? `Pool: ${matchedPool.name}` : `Pool: ${selectedPoolId}`}
                onClear={() => onPoolChange('ALL')}
              />
            )}
            {selectedBankAccountId !== 'ALL' && (
              <RecordFilterBadge
                label={matchedBank ? `Bank: ${matchedBank.name}` : `Bank: ${selectedBankAccountId}`}
                onClear={() => onBankChange('ALL')}
              />
            )}
          </View>
        )}
      </View>

      {/* List */}
      <FlatList
        data={paginatedTxs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TransactionRow
            amount={item.amount}
            flowType={item.effectiveType}
            rawFlowType={item.flowType}
            poolName={item.poolName}
            categoryName={item.categoryName}
            note={item.note}
            recordedAt={item.recordedAt}
            onPress={() => setDetailTx(item)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonCard count={4} />
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="clock" size={32} color="#94A3B8" />
              <Text style={styles.emptyTitle}>{t('transactions.noTransactionsFound')}</Text>
              <Text style={styles.emptySubtitle}>{t('transactions.emptySubtitle')}</Text>
            </View>
          )
        }
        ListFooterComponent={
          transactions.length >= 5 ? (
            <View style={styles.paginationWrap}>
              <MobilePaginationBar
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={transactions.length}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            </View>
          ) : null
        }
      />

      {/* Filter Sheet */}
      <HistoryFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        flowFilter={flowFilter}
        onSelectFlow={(f) => {
          onFlowFilterChange(f);
          onPageChange(1);
        }}
        selectedPoolId={selectedPoolId}
        onSelectPool={(id) => {
          onPoolChange(id);
          onPageChange(1);
        }}
        selectedBankAccountId={selectedBankAccountId}
        onSelectBank={(id) => {
          onBankChange(id);
          onPageChange(1);
        }}
        sortField={sortField}
        sortDir={sortDir}
        onSortFieldChange={onSortFieldChange}
        onSortDirChange={onSortDirChange}
        pools={pools}
        bankAccounts={bankAccounts}
        onReset={() => {
          onFlowFilterChange('ALL');
          onPoolChange('ALL');
          onBankChange('ALL');
          onSortFieldChange('recordedAt');
          onSortDirChange('desc');
          onPageChange(1);
        }}
        activeCount={activeCount}
      />

      {/* Details Sheet */}
      <TransactionDetailSheet
        visible={!!detailTx}
        transaction={detailTx}
        onClose={() => setDetailTx(null)}
        onNavigateToPool={onNavigateToPool}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lockedHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  filterBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563eb',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterBtnTextActive: {
    color: '#2563eb',
  },
  csvBtn: {
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  paginationWrap: {
    paddingVertical: 12,
  },
});
