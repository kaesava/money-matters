import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  SegmentedTabs,
  SearchInput,
  MobileFilterSheet,
  FilterSection,
  FilterSortOption,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { SourceToEdit } from '../IncomeExpenseFormModal';
import { useRecurringSchedules } from './useRecurringSchedules';
import { RecurringSchedulesCards } from './RecurringSchedulesCards';
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

      {/* In-Screen Add Schedule Button */}
      {onAddSchedule && (
        <View style={styles.addScheduleRow}>
          <TouchableOpacity
            style={styles.addScheduleBtn}
            onPress={() => onAddSchedule(setupSubSegment)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.addScheduleBtnText}>
              {setupSubSegment === 'INCOME'
                ? t('payday.addIncomeSchedule')
                : t('payday.addExpenseSchedule')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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

      <MobileFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        activeCount={
          (setupSubSegment === 'INCOME' && selectedIncomeBankId !== 'ALL' ? 1 : 0) +
          (setupSubSegment === 'EXPENSE' && selectedExpensePoolId !== 'ALL' ? 1 : 0) +
          (sortField !== 'name' || sortOrder !== 'asc' ? 1 : 0)
        }
        sortField={sortField}
        sortOrder={sortOrder}
        sortOptions={[
          { id: 'name', label: t('common.name') || 'Name' },
          { id: 'amount', label: t('common.amount') || 'Amount' },
          { id: 'date', label: t('common.date') || 'Date' },
        ]}
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
        sections={
          setupSubSegment === 'INCOME'
            ? [
                {
                  id: 'bank',
                  title: t('bankAccounts.title') || 'Receiving Bank Account',
                  selectedValue: selectedIncomeBankId,
                  onSelect: (bId: string) => {
                    setSelectedIncomeBankId(bId);
                    setIncomePage(1);
                  },
                  options: [
                    { id: 'ALL', label: t('common.all') || 'All Accounts' },
                    ...bankAccounts.map((b) => ({ id: b.id, label: b.name })),
                  ],
                },
              ]
            : [
                {
                  id: 'pool',
                  title: t('categories.title') || 'Target Pool',
                  selectedValue: selectedExpensePoolId,
                  onSelect: (pId: string) => {
                    setSelectedExpensePoolId(pId);
                    setExpensePage(1);
                  },
                  options: [
                    { id: 'ALL', label: t('common.all') || 'All Pools' },
                    ...pools.map((p) => ({ id: p.id, label: p.name })),
                  ],
                },
              ]
        }
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
  addScheduleRow: {
    marginBottom: 14,
  },
  addScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    shadowColor: '#2563eb',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  addScheduleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
