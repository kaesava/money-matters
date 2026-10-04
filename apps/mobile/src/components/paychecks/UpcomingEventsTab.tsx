import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SearchInput, MobilePaginationBar, MobileFilterSheet } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import {
  PaycheckEventSection,
  PaycheckTransferEvent,
} from './PaycheckEventSection';
import { useUpcomingEvents } from './useUpcomingEvents';

interface UpcomingEventsTabProps {
  rawIncomeEvents: any[];
  rawExpenseEvents: any[];
  rawTransferEvents: any[];
  bankAccounts: any[];
  pools: any[];
  incomeSources?: any[];
  onOpenPaydayWizard: (eventId: string) => void;
  onMarkExpensePaid: (expenseId: string, amount: string) => void;
  onEditExpense: (expense: any) => void;
  onEditIncome?: (income: any) => void;
  onDeleteIncomeEvent: (item: { id: string; name?: string | null }) => void;
  onDeleteExpenseEvent: (item: { id: string; name?: string | null }) => void;
  onExecuteTransfer: (item: PaycheckTransferEvent) => void;
  onDeleteTransferEvent: (item: { id: string; name?: string | null }) => void;
  initialKind?: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';
  initialPoolId?: string | null;
  initialCategoryId?: string | null;
}

export function UpcomingEventsTab({
  rawIncomeEvents,
  rawExpenseEvents,
  rawTransferEvents,
  bankAccounts,
  pools,
  incomeSources,
  onOpenPaydayWizard,
  onMarkExpensePaid,
  onEditExpense,
  onEditIncome,
  onDeleteIncomeEvent,
  onDeleteExpenseEvent,
  onExecuteTransfer,
  onDeleteTransferEvent,
  initialKind,
  initialPoolId,
  initialCategoryId,
}: UpcomingEventsTabProps) {
  const [upcomingSearchQuery, setUpcomingSearchQuery] = useState('');
  const [upcomingScopeFilter, setUpcomingScopeFilter] = useState<'ALL' | 'SHARED' | 'PRIVATE'>('ALL');
  const [upcomingKindFilter, setUpcomingKindFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>(
    initialKind || 'ALL'
  );
  const [upcomingSortField, setUpcomingSortField] = useState<'date' | 'name' | 'amount'>('date');
  const [upcomingSortOrder, setUpcomingSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const UPCOMING_PAGE_SIZE = 10;

  const activeUpcomingFilterCount =
    (upcomingScopeFilter !== 'ALL' ? 1 : 0) +
    (upcomingKindFilter !== 'ALL' ? 1 : 0) +
    (initialPoolId ? 1 : 0) +
    (initialCategoryId ? 1 : 0);

  const { filteredUpcomingEvents } = useUpcomingEvents({
    rawIncomeEvents,
    rawExpenseEvents,
    rawTransferEvents,
    bankAccounts,
    pools,
    incomeSources,
    upcomingKindFilter,
    upcomingScopeFilter,
    upcomingSearchQuery,
    upcomingSortField,
    upcomingSortOrder,
    poolIdFilter: initialPoolId,
    categoryIdFilter: initialCategoryId,
  });

  const paginatedUpcomingEvents = useMemo(() => {
    const start = (upcomingPage - 1) * UPCOMING_PAGE_SIZE;
    return filteredUpcomingEvents.slice(start, start + UPCOMING_PAGE_SIZE);
  }, [filteredUpcomingEvents, upcomingPage]);

  return (
    <View style={styles.eventsView}>
      {/* Search + Filter Row */}
      <View style={styles.timelineControlRow}>
        <View style={{ flex: 1 }}>
          <SearchInput
            placeholder={t('common.search')}
            value={upcomingSearchQuery}
            onChangeText={(text) => {
              setUpcomingSearchQuery(text);
              setUpcomingPage(1);
            }}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeUpcomingFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setFilterSheetVisible(true)}
        >
          <Feather
            name="sliders"
            size={15}
            color={activeUpcomingFilterCount > 0 ? '#2563eb' : '#64748B'}
          />
          <Text
            style={[
              styles.filterBtnText,
              activeUpcomingFilterCount > 0 && styles.filterBtnTextActive,
            ]}
          >
            {t('common.filter')}
            {activeUpcomingFilterCount > 0 ? ` (${activeUpcomingFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <PaycheckEventSection
        events={paginatedUpcomingEvents}
        onOpenPaydayWizard={onOpenPaydayWizard}
        onMarkExpensePaid={onMarkExpensePaid}
        onEditUpcomingIncome={onEditIncome}
        onEditUpcomingExpense={onEditExpense}
        onDeleteUpcomingIncome={onDeleteIncomeEvent}
        onDeleteUpcomingExpense={onDeleteExpenseEvent}
        onExecuteTransfer={onExecuteTransfer}
        onDeleteUpcomingTransfer={onDeleteTransferEvent}
      />

      {filteredUpcomingEvents.length >= 5 && (
        <View style={{ marginTop: 8 }}>
          <MobilePaginationBar
            page={upcomingPage}
            totalPages={Math.ceil(filteredUpcomingEvents.length / UPCOMING_PAGE_SIZE)}
            pageSize={UPCOMING_PAGE_SIZE}
            totalItems={filteredUpcomingEvents.length}
            onPageChange={setUpcomingPage}
            onPageSizeChange={() => {}}
          />
        </View>
      )}

      <MobileFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        activeCount={activeUpcomingFilterCount}
        sortField={upcomingSortField}
        sortOrder={upcomingSortOrder}
        sortOptions={[
          { id: 'date', label: t('common.date') || 'Date' },
          { id: 'amount', label: t('common.amount') || 'Amount' },
          { id: 'name', label: t('common.name') || 'Name' },
        ]}
        onSortFieldChange={(field) => {
          setUpcomingSortField(field as 'date' | 'amount' | 'name');
          setUpcomingPage(1);
        }}
        onSortOrderChange={(order) => {
          setUpcomingSortOrder(order);
          setUpcomingPage(1);
        }}
        sections={[
          {
            id: 'scope',
            title: t('dashboard.scope') || 'Time Horizon',
            selectedValue: upcomingScopeFilter,
            onSelect: (val) => {
              setUpcomingScopeFilter(val as any);
              setUpcomingPage(1);
            },
            options: [
              { id: 'ALL', label: t('common.all') || 'All Events' },
              { id: 'CURRENT_CYCLE', label: t('incomeBillsTabs.currentCycle') || 'Current Pay Period' },
              { id: '30_DAYS', label: t('incomeBillsTabs.days30') || 'Next 30 Days' },
              { id: '60_DAYS', label: t('incomeBillsTabs.days60') || 'Next 60 Days' },
            ],
          },
          {
            id: 'kind',
            title: t('common.type') || 'Event Type',
            selectedValue: upcomingKindFilter,
            onSelect: (val) => {
              setUpcomingKindFilter(val as any);
              setUpcomingPage(1);
            },
            options: [
              { id: 'ALL', label: t('common.all') || 'All Types' },
              { id: 'INCOME', label: t('common.income') || 'Income' },
              { id: 'EXPENSE', label: t('common.expenses') || 'Expenses & Bills' },
              { id: 'TRANSFER', label: t('common.transfers') || 'Transfers' },
            ],
          },
        ]}
        onReset={() => {
          setUpcomingScopeFilter('ALL');
          setUpcomingKindFilter('ALL');
          setUpcomingSortField('date');
          setUpcomingSortOrder('asc');
          setUpcomingPage(1);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  eventsView: {
    paddingHorizontal: 20,
  },
  timelineControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  filterBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  filterBtnTextActive: {
    color: '#2563eb',
  },
});
