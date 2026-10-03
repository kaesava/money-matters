import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  SegmentedTabs,
  SearchInput,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { SourceToEdit } from '../IncomeExpenseFormModal';
import { useRecurringSchedules } from './useRecurringSchedules';
import { RecurringSchedulesCards } from './RecurringSchedulesCards';
import { SetupSchedulesFilterSheet } from './SetupSchedulesFilterSheet';
import { IncomeSourceItem } from './IncomeSourceCard';
import { ExpenseSourceItem } from './ExpenseBillCard';

interface RecurringSchedulesTabProps {
  incomeSources: IncomeSourceItem[];
  expenseSources: ExpenseSourceItem[];
  bankAccounts: { id: string; name: string; bankProvider?: string; balance?: string | number }[];
  pools: { id: string; name: string; poolType?: string; currentBalance?: string | number; isPrivate?: boolean | null }[];
  isLoadingIncome: boolean;
  isLoadingExpense: boolean;
  onAddSchedule?: (mode: 'INCOME' | 'EXPENSE') => void;
  onEditSchedule: (source: SourceToEdit, mode: 'INCOME' | 'EXPENSE') => void;
  onBurstModal?: (source: IncomeSourceItem | ExpenseSourceItem, mode: 'INCOME' | 'EXPENSE') => void;
}

export function RecurringSchedulesTab({
  incomeSources,
  expenseSources,
  bankAccounts,
  pools,
  isLoadingIncome,
  isLoadingExpense,
  onAddSchedule,
  onEditSchedule,
  onBurstModal,
}: RecurringSchedulesTabProps) {
  const [setupSubSegment, setSetupSubSegment] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [selectedIncomeBankId, setSelectedIncomeBankId] = useState<string>('ALL');
  const [selectedExpensePoolId, setSelectedExpensePoolId] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'name' | 'amount' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [incomePage, setIncomePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');
  const PAGE_SIZE = 10;

  const { filteredIncomeSources, filteredExpenseSources } = useRecurringSchedules({
    incomeSources,
    expenseSources,
    bankAccounts,
    pools,
    selectedIncomeBankId,
    selectedExpensePoolId,
    scheduleSearchQuery,
    sortField,
    sortOrder,
  });

  const activeFilterCount = setupSubSegment === 'INCOME'
    ? (selectedIncomeBankId !== 'ALL' ? 1 : 0)
    : (selectedExpensePoolId !== 'ALL' ? 1 : 0);

  const paginatedIncomeSources = useMemo(() => {
    const start = (incomePage - 1) * PAGE_SIZE;
    return filteredIncomeSources.slice(start, start + PAGE_SIZE);
  }, [filteredIncomeSources, incomePage]);

  const paginatedExpenseSources = useMemo(() => {
    const start = (expensePage - 1) * PAGE_SIZE;
    return filteredExpenseSources.slice(start, start + PAGE_SIZE);
  }, [filteredExpenseSources, expensePage]);

  return (
    <View style={styles.sourcesView}>
      {/* Top Search + Filter Row (Filters across both sub-tabs) */}
      <View style={styles.searchAndFilterRow}>
        <View style={{ flex: 1 }}>
          <SearchInput
            placeholder={t('payday.searchSchedules')}
            value={scheduleSearchQuery}
            onChangeText={(text) => {
              setScheduleSearchQuery(text);
              setIncomePage(1);
              setExpensePage(1);
            }}
          />
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setFilterSheetVisible(true)}
          activeOpacity={0.7}
        >
          <Feather
            name="sliders"
            size={15}
            color={activeFilterCount > 0 ? '#2563eb' : '#64748B'}
          />
          <Text
            style={[
              styles.filterBtnText,
              activeFilterCount > 0 && styles.filterBtnTextActive,
            ]}
          >
            {t('common.filter')}
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub-tabs: Income Schedules vs Expense Schedules */}
      <View style={{ marginBottom: 14 }}>
        <SegmentedTabs<'INCOME' | 'EXPENSE'>
          tabs={[
            {
              key: 'INCOME',
              label: `${t('incomeBillsTabs.incomeSchedules')} (${filteredIncomeSources.length})`,
            },
            {
              key: 'EXPENSE',
              label: `${t('incomeBillsTabs.expenseSchedules')} (${filteredExpenseSources.length})`,
            },
          ]}
          activeKey={setupSubSegment}
          onChange={(key) => {
            setSetupSubSegment(key);
          }}
        />
      </View>

      <RecurringSchedulesCards
        setupSubSegment={setupSubSegment}
        isLoadingIncome={isLoadingIncome}
        isLoadingExpense={isLoadingExpense}
        filteredIncomeSources={filteredIncomeSources}
        filteredExpenseSources={filteredExpenseSources}
        paginatedIncomeSources={paginatedIncomeSources}
        paginatedExpenseSources={paginatedExpenseSources}
        incomePage={incomePage}
        expensePage={expensePage}
        pageSize={PAGE_SIZE}
        onIncomePageChange={setIncomePage}
        onExpensePageChange={setExpensePage}
        onEditSchedule={onEditSchedule}
        onOccurrences={onBurstModal}
      />

      <SetupSchedulesFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        activeSubSegment={setupSubSegment}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortFieldChange={(field) => {
          setSortField(field as 'name' | 'amount' | 'date');
          setIncomePage(1);
          setExpensePage(1);
        }}
        onSortOrderChange={(order) => {
          setSortOrder(order);
          setIncomePage(1);
          setExpensePage(1);
        }}
        selectedBankId={selectedIncomeBankId}
        onBankChange={(bId) => {
          setSelectedIncomeBankId(bId);
          setIncomePage(1);
        }}
        bankAccounts={bankAccounts.map((b) => ({ id: b.id, name: b.name }))}
        selectedPoolId={selectedExpensePoolId}
        onPoolChange={(pId) => {
          setSelectedExpensePoolId(pId);
          setExpensePage(1);
        }}
        pools={pools.map((p) => ({ id: p.id, name: p.name }))}
        onReset={() => {
          setSelectedIncomeBankId('ALL');
          setSelectedExpensePoolId('ALL');
          setSortField('name');
          setSortOrder('asc');
          setIncomePage(1);
          setExpensePage(1);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sourcesView: {
    paddingHorizontal: 20,
  },
  searchAndFilterRow: {
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
