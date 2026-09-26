import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SkeletonCard, MobilePaginationBar } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { IncomeSourceCard, IncomeSourceItem } from './IncomeSourceCard';
import { ExpenseBillCard, ExpenseSourceItem } from './ExpenseBillCard';
import { SourceToEdit } from '../IncomeExpenseFormModal';

interface RecurringSchedulesCardsProps {
  setupSubSegment: 'INCOME' | 'EXPENSE';
  isLoadingIncome: boolean;
  isLoadingExpense: boolean;
  filteredIncomeSources: IncomeSourceItem[];
  filteredExpenseSources: ExpenseSourceItem[];
  paginatedIncomeSources: IncomeSourceItem[];
  paginatedExpenseSources: ExpenseSourceItem[];
  incomePage: number;
  expensePage: number;
  pageSize: number;
  onIncomePageChange: (page: number) => void;
  onExpensePageChange: (page: number) => void;
  onEditSchedule: (source: SourceToEdit, mode: 'INCOME' | 'EXPENSE') => void;
}

export function RecurringSchedulesCards({
  setupSubSegment,
  isLoadingIncome,
  isLoadingExpense,
  filteredIncomeSources,
  filteredExpenseSources,
  paginatedIncomeSources,
  paginatedExpenseSources,
  incomePage,
  expensePage,
  pageSize,
  onIncomePageChange,
  onExpensePageChange,
  onEditSchedule,
}: RecurringSchedulesCardsProps) {
  if (setupSubSegment === 'INCOME') {
    return (
      <View style={styles.cardsStack}>
        {isLoadingIncome ? (
          <SkeletonCard count={2} />
        ) : filteredIncomeSources.length === 0 ? (
          <Text style={styles.emptySchedulesText}>{t('payday.noIncomeSchedules')}</Text>
        ) : (
          <>
            {paginatedIncomeSources.map((inc) => (
              <IncomeSourceCard
                key={inc.id}
                inc={inc}
                onEdit={(s) => onEditSchedule(s, 'INCOME')}
              />
            ))}
            {filteredIncomeSources.length >= 5 && (
              <MobilePaginationBar
                page={incomePage}
                totalPages={Math.ceil(filteredIncomeSources.length / pageSize)}
                pageSize={pageSize}
                totalItems={filteredIncomeSources.length}
                onPageChange={onIncomePageChange}
                onPageSizeChange={() => {}}
              />
            )}
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.cardsStack}>
      {isLoadingExpense ? (
        <SkeletonCard count={2} />
      ) : filteredExpenseSources.length === 0 ? (
        <Text style={styles.emptySchedulesText}>{t('payday.noExpenseBills')}</Text>
      ) : (
        <>
          {paginatedExpenseSources.map((exp) => (
            <ExpenseBillCard
              key={exp.id}
              exp={exp}
              categoryName={exp.poolName || exp.categoryName || 'Pool'}
              onEdit={(s) => onEditSchedule(s, 'EXPENSE')}
            />
          ))}
          {filteredExpenseSources.length >= 5 && (
            <MobilePaginationBar
              page={expensePage}
              totalPages={Math.ceil(filteredExpenseSources.length / pageSize)}
              pageSize={pageSize}
              totalItems={filteredExpenseSources.length}
              onPageChange={onExpensePageChange}
              onPageSizeChange={() => {}}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardsStack: {
    gap: 10,
  },
  emptySchedulesText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 12,
    textAlign: 'center',
  },
});
