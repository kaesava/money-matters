import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  MobilePaginationBar,
  SkeletonCard,
  MobileFilterSheet,
  DESIGN_TOKENS,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { TransactionRow } from '../TransactionRow';
import { TransactionDetailSheet, TransactionDetailRecord } from './TransactionDetailSheet';
import { LedgerFilterControls } from './ledger/LedgerFilterControls';
import { useLedgerFilterSections } from './hooks/useLedgerFilterSections';

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

  const filterSections = useLedgerFilterSections({
    flowFilter: flowFilter as 'ALL' | 'DEBIT' | 'CREDIT',
    onFlowFilterChange,
    selectedPoolId,
    onPoolChange,
    selectedBankAccountId,
    onBankChange,
    pools,
    bankAccounts,
    onPageChange,
  });

  return (
    <View style={styles.container}>
      <LedgerFilterControls
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        activeCount={activeCount}
        onOpenFilterSheet={() => setFilterSheetVisible(true)}
        onExportCsv={onExportCsv}
        disableExport={transactions.length === 0}
        selectedPoolId={selectedPoolId}
        selectedBankAccountId={selectedBankAccountId}
        matchedPoolName={matchedPool?.name}
        matchedBankName={matchedBank?.name}
        onClearPool={() => onPoolChange('ALL')}
        onClearBank={() => onBankChange('ALL')}
      />

      <FlatList
        data={paginatedTxs}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DESIGN_TOKENS.colors.sereneBlue}
          />
        }
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
              <Feather name="clock" size={32} color={DESIGN_TOKENS.colors.subtleText} />
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

      <MobileFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        activeCount={activeCount}
        sortField={sortField}
        sortOrder={sortDir}
        sortOptions={[
          { id: 'recordedAt', label: t('transactions.date') },
          { id: 'amount', label: t('transactions.amount') },
        ]}
        onSortFieldChange={(f) =>
          onSortFieldChange(f as 'recordedAt' | 'amount' | 'description')
        }
        onSortOrderChange={onSortDirChange}
        sections={filterSections}
        onReset={() => {
          onFlowFilterChange('ALL');
          onPoolChange('ALL');
          onBankChange('ALL');
          onSortFieldChange('recordedAt');
          onSortDirChange('desc');
          onPageChange(1);
        }}
      />

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
    color: DESIGN_TOKENS.colors.primary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.subtleText,
    textAlign: 'center',
  },
  paginationWrap: {
    paddingVertical: 12,
  },
});
