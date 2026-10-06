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
import {
  MobilePaydayAllocationDetailModal,
  MobilePaydayAllocationRecord,
} from '../paychecks/MobilePaydayAllocationDetailModal';
import { IncomeSplitHistoryRow } from './splits/IncomeSplitHistoryRow';
import { IncomeSplitsHeaderControls } from './IncomeSplitsHeaderControls';

interface IncomeSplitsTabProps {
  plans: MobilePaydayAllocationRecord[];
  isLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedBankId: string;
  onBankChange: (id: string) => void;
  sortField: 'createdAt' | 'expectedDate' | 'incomeName' | 'receivingAccount' | 'amount';
  sortDir: 'asc' | 'desc';
  onSortFieldChange: (
    field: 'createdAt' | 'expectedDate' | 'incomeName' | 'receivingAccount' | 'amount'
  ) => void;
  onSortDirChange: (dir: 'asc' | 'desc') => void;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  bankAccounts: Array<{ id: string; name: string }>;
  onExportCsv: () => void;
}

export function IncomeSplitsTab({
  plans,
  isLoading,
  refreshing,
  onRefresh,
  searchQuery,
  onSearchChange,
  selectedBankId,
  onBankChange,
  sortField,
  sortDir,
  onSortFieldChange,
  onSortDirChange,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  bankAccounts,
  onExportCsv,
}: IncomeSplitsTabProps) {
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MobilePaydayAllocationRecord | null>(null);

  const activeCount = selectedBankId !== 'ALL' ? 1 : 0;
  const totalPages = Math.ceil(plans.length / pageSize) || 1;
  const paginatedPlans = plans.slice((page - 1) * pageSize, page * pageSize);

  return (
    <View style={styles.container}>
      {/* Search & Filter Header */}
      <IncomeSplitsHeaderControls
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        activeCount={activeCount}
        onOpenFilterSheet={() => setFilterSheetVisible(true)}
        onExportCsv={onExportCsv}
        canExport={plans.length > 0}
      />

      {/* Plans List */}
      <FlatList
        data={paginatedPlans}
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
          <IncomeSplitHistoryRow item={item} onPress={() => setSelectedPlan(item)} />
        )}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonCard count={4} />
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="layers" size={32} color={DESIGN_TOKENS.colors.subtleText} />
              <Text style={styles.emptyTitle}>{t('transactions.noTransactionsFound')}</Text>
              <Text style={styles.emptySubtitle}>{t('transactions.emptySubtitle')}</Text>
            </View>
          )
        }
        ListFooterComponent={
          plans.length >= 5 ? (
            <View style={styles.paginationWrap}>
              <MobilePaginationBar
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={plans.length}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            </View>
          ) : null
        }
      />

      {/* Filter Sheet */}
      <MobileFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        activeCount={activeCount}
        sortField={sortField}
        sortOrder={sortDir}
        sortOptions={[
          { id: 'expectedDate', label: t('transactions.date') },
          { id: 'amount', label: t('transactions.amount') },
          { id: 'incomeName', label: t('transactions.description') },
          { id: 'receivingAccount', label: t('bankAccounts.title') },
          { id: 'createdAt', label: t('common.created') },
        ]}
        onSortFieldChange={(f) =>
          onSortFieldChange(
            f as 'createdAt' | 'expectedDate' | 'incomeName' | 'receivingAccount' | 'amount'
          )
        }
        onSortOrderChange={onSortDirChange}
        sections={[
          {
            id: 'bank',
            title: t('bankAccounts.title'),
            selectedValue: selectedBankId,
            onSelect: (id: string) => {
              onBankChange(id);
              onPageChange(1);
            },
            options: [
              { id: 'ALL', label: t('common.all') },
              ...bankAccounts.map((b) => ({ id: b.id, label: b.name })),
            ],
          },
        ]}
        onReset={() => {
          onBankChange('ALL');
          onSortFieldChange('expectedDate');
          onSortDirChange('desc');
          onPageChange(1);
        }}
      />

      {/* Plan Details Modal */}
      <MobilePaydayAllocationDetailModal
        visible={!!selectedPlan}
        allocation={selectedPlan}
        onClose={() => setSelectedPlan(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
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
