import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SearchInput, MobilePaginationBar } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import {
  PaycheckEventSection,
  PaycheckTransferEvent,
} from './PaycheckEventSection';
import { UpcomingTimelineFilterSheet } from './UpcomingTimelineFilterSheet';
import { useUpcomingEvents } from './useUpcomingEvents';

interface UpcomingEventsTabProps {
  rawIncomeEvents: any[];
  rawExpenseEvents: any[];
  rawTransferEvents: any[];
  bankAccounts: any[];
  pools: any[];
  onOpenPaydayWizard: (eventId: string) => void;
  onMarkExpensePaid: (expenseId: string, amount: string) => void;
  onEditExpense: (expense: any) => void;
  onDeleteIncomeEvent: (item: { id: string; name?: string | null }) => void;
  onDeleteExpenseEvent: (item: { id: string; name?: string | null }) => void;
  onExecuteTransfer: (item: PaycheckTransferEvent) => void;
  onDeleteTransferEvent: (item: { id: string; name?: string | null }) => void;
}

export function UpcomingEventsTab({
  rawIncomeEvents,
  rawExpenseEvents,
  rawTransferEvents,
  bankAccounts,
  pools,
  onOpenPaydayWizard,
  onMarkExpensePaid,
  onEditExpense,
  onDeleteIncomeEvent,
  onDeleteExpenseEvent,
  onExecuteTransfer,
  onDeleteTransferEvent,
}: UpcomingEventsTabProps) {
  const [upcomingSearchQuery, setUpcomingSearchQuery] = useState('');
  const [upcomingScopeFilter, setUpcomingScopeFilter] = useState<'ALL' | 'SHARED' | 'PRIVATE'>('ALL');
  const [upcomingKindFilter, setUpcomingKindFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('ALL');
  const [upcomingSortField, setUpcomingSortField] = useState<'date' | 'name' | 'amount'>('date');
  const [upcomingSortOrder, setUpcomingSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const UPCOMING_PAGE_SIZE = 10;

  const activeUpcomingFilterCount = (upcomingScopeFilter !== 'ALL' ? 1 : 0) + (upcomingKindFilter !== 'ALL' ? 1 : 0);

  const { filteredUpcomingEvents } = useUpcomingEvents({
    rawIncomeEvents,
    rawExpenseEvents,
    rawTransferEvents,
    bankAccounts,
    pools,
    upcomingKindFilter,
    upcomingScopeFilter,
    upcomingSearchQuery,
    upcomingSortField,
    upcomingSortOrder,
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
        onEditUpcomingExpense={onEditExpense}
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

      <UpcomingTimelineFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        activeCount={activeUpcomingFilterCount}
        upcomingSortField={upcomingSortField}
        upcomingSortOrder={upcomingSortOrder}
        upcomingScopeFilter={upcomingScopeFilter}
        upcomingKindFilter={upcomingKindFilter}
        onSortFieldChange={(field) => {
          setUpcomingSortField(field);
          setUpcomingPage(1);
        }}
        onSortOrderChange={(order) => {
          setUpcomingSortOrder(order);
          setUpcomingPage(1);
        }}
        onScopeChange={(val) => {
          setUpcomingScopeFilter(val);
          setUpcomingPage(1);
        }}
        onKindChange={(val) => {
          setUpcomingKindFilter(val);
          setUpcomingPage(1);
        }}
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
