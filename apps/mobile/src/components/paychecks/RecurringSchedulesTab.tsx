import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  SegmentedTabs,
  SearchInput,
  MobileBankPicker,
  MobilePoolPicker,
  MobileButton,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { SourceToEdit } from '../IncomeExpenseFormModal';
import { useRecurringSchedules } from './useRecurringSchedules';
import { RecurringSchedulesCards } from './RecurringSchedulesCards';

interface RecurringSchedulesTabProps {
  incomeSources: any[];
  expenseSources: any[];
  bankAccounts: any[];
  pools: any[];
  isLoadingIncome: boolean;
  isLoadingExpense: boolean;
  onAddSchedule: (mode: 'INCOME' | 'EXPENSE') => void;
  onEditSchedule: (source: SourceToEdit, mode: 'INCOME' | 'EXPENSE') => void;
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
}: RecurringSchedulesTabProps) {
  const [setupSubSegment, setSetupSubSegment] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [selectedIncomeBankId, setSelectedIncomeBankId] = useState<string>('ALL');
  const [selectedExpensePoolId, setSelectedExpensePoolId] = useState<string>('ALL');
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
  });

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
            setScheduleSearchQuery('');
          }}
        />
      </View>

      {/* Row 1: Search + Filter Picker */}
      <View style={styles.searchAndFilterRow}>
        <View style={styles.searchCol}>
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

        <View style={styles.filterCol}>
          {setupSubSegment === 'INCOME' ? (
            <MobileBankPicker
              banks={bankAccounts.map((b) => ({
                id: b.id,
                name: b.name,
                institution: b.bankProvider,
                currentBalance: b.balance,
                availableBalance: b.balance,
              }))}
              selectedBankId={selectedIncomeBankId}
              onSelectBank={(bId) => {
                setSelectedIncomeBankId(bId);
                setIncomePage(1);
              }}
              allowAllOption={true}
              compact={true}
            />
          ) : (
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
              compact={true}
            />
          )}
        </View>
      </View>

      {/* Row 2: Add Schedule Button */}
      <View style={styles.actionRow}>
        <MobileButton
          variant="secondary"
          size="sm"
          onPress={() => onAddSchedule(setupSubSegment)}
          style={styles.addBtn}
        >
          {setupSubSegment === 'INCOME'
            ? t('modals.incomeExpenseForm.titleAddIncome')
            : t('modals.incomeExpenseForm.titleAddExpense')}
        </MobileButton>
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
    gap: 8,
    marginBottom: 10,
  },
  searchCol: {
    flex: 1.1,
  },
  filterCol: {
    flex: 0.9,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 14,
  },
  addBtn: {
    alignSelf: 'flex-start',
  },
});
