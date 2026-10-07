import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  SegmentedTabs,
  MobileFilterSheet,
  MobileBankPicker,
  MobilePoolPicker,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { SourceToEdit } from '../IncomeExpenseFormModal';
import { useRecurringSchedules } from './useRecurringSchedules';
import { RecurringSchedulesCards } from './RecurringSchedulesCards';
import { IncomeSourceItem } from './IncomeSourceCard';
import { ExpenseSourceItem } from './ExpenseBillCard';
import { SchedulesSearchFilterBar } from './schedules/SchedulesSearchFilterBar';
import { AddScheduleButtonRow } from './schedules/AddScheduleButtonRow';

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
      <SchedulesSearchFilterBar
        searchQuery={scheduleSearchQuery}
        onSearchChange={(text) => {
          setScheduleSearchQuery(text);
          setIncomePage(1);
          setExpensePage(1);
        }}
        activeFilterCount={activeFilterCount}
        onOpenFilterSheet={() => setFilterSheetVisible(true)}
      />

      <View style={styles.subSegmentWrapper}>
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
          onChange={(key) => setSetupSubSegment(key)}
        />
      </View>

      {onAddSchedule && (
        <AddScheduleButtonRow
          setupSubSegment={setupSubSegment}
          onAddSchedule={onAddSchedule}
        />
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
          { id: 'name', label: t('common.name') },
          { id: 'amount', label: t('common.amount') },
          { id: 'date', label: t('common.date') },
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
                  title: t('bankAccounts.title'),
                  renderCustom: () => (
                    <MobileBankPicker
                      banks={bankAccounts.map((b) => ({
                        id: b.id,
                        name: b.name,
                        institution: b.bankProvider,
                        currentBalance: b.balance,
                      }))}
                      selectedBankId={selectedIncomeBankId}
                      onSelectBank={(bId) => {
                        setSelectedIncomeBankId(bId);
                        setIncomePage(1);
                      }}
                      allowAllOption={true}
                    />
                  ),
                },
              ]
            : [
                {
                  id: 'pool',
                  title: t('categories.title'),
                  renderCustom: () => (
                    <MobilePoolPicker
                      pools={pools.map((p) => ({
                        id: p.id,
                        name: p.name,
                        poolType: p.poolType,
                        currentBalance: p.currentBalance,
                        isPrivate: p.isPrivate,
                      }))}
                      selectedPoolId={selectedExpensePoolId}
                      onSelectPool={(pId) => {
                        setSelectedExpensePoolId(pId);
                        setExpensePage(1);
                      }}
                      allowAllOption={true}
                    />
                  ),
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
  subSegmentWrapper: {
    marginBottom: 14,
  },
});
