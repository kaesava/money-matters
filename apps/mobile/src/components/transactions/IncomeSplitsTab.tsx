import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SearchInput, MobilePaginationBar, SkeletonCard } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../lib/format';
import { MobilePaydayAllocationDetailModal, MobilePaydayAllocationRecord } from '../paychecks/MobilePaydayAllocationDetailModal';
import { IncomeSplitsFilterSheet } from './IncomeSplitsFilterSheet';

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
  onSortFieldChange: (field: 'createdAt' | 'expectedDate' | 'incomeName' | 'receivingAccount' | 'amount') => void;
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
      <View style={styles.lockedHeader}>
        <View style={styles.controlsRow}>
          <View style={{ flex: 1 }}>
            <SearchInput
              placeholder={t('transactions.searchPaydaysPlaceholder')}
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
            disabled={plans.length === 0}
            activeOpacity={0.7}
          >
            <Feather name="download" size={14} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Plans List */}
      <FlatList
        data={paginatedPlans}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.planCard}
            onPress={() => setSelectedPlan(item)}
            activeOpacity={0.7}
          >
            <View style={styles.planHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>{item.incomeName || 'Income Deposit'}</Text>
                <Text style={styles.planSubtitle}>{item.receivingAccountName || 'Main Account'}</Text>
              </View>
              <Text style={styles.planAmount}>+{formatAUD(item.totalIncomeAmount)}</Text>
            </View>

            <View style={styles.planFooter}>
              <Text style={styles.planDate}>{formatDate(item.expectedDate || item.createdAt)}</Text>
              <View style={styles.detailsBtn}>
                <Text style={styles.detailsBtnText}>{t('transactions.details')}</Text>
                <Feather name="chevron-right" size={14} color="#2563eb" />
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonCard count={4} />
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="layers" size={32} color="#94A3B8" />
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
      <IncomeSplitsFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        selectedBankId={selectedBankId}
        onSelectBank={(id) => {
          onBankChange(id);
          onPageChange(1);
        }}
        sortField={sortField}
        sortDir={sortDir}
        onSortFieldChange={onSortFieldChange}
        onSortDirChange={onSortDirChange}
        bankAccounts={bankAccounts}
        onReset={() => {
          onBankChange('ALL');
          onSortFieldChange('expectedDate');
          onSortDirChange('desc');
          onPageChange(1);
        }}
        activeCount={activeCount}
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
  lockedHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
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
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  planSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  planAmount: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#22c55e',
  },
  planFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  planDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
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
