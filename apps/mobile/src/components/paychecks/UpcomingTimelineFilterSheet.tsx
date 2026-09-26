import React from 'react';
import { MobileFilterSheet } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface UpcomingTimelineFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  activeCount: number;
  upcomingSortField: 'date' | 'name' | 'amount';
  upcomingSortOrder: 'asc' | 'desc';
  upcomingScopeFilter: 'ALL' | 'SHARED' | 'PRIVATE';
  upcomingKindFilter: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';
  onSortFieldChange: (field: 'date' | 'name' | 'amount') => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onScopeChange: (scope: 'ALL' | 'SHARED' | 'PRIVATE') => void;
  onKindChange: (kind: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER') => void;
  onReset: () => void;
}

export function UpcomingTimelineFilterSheet({
  visible,
  onClose,
  activeCount,
  upcomingSortField,
  upcomingSortOrder,
  upcomingScopeFilter,
  upcomingKindFilter,
  onSortFieldChange,
  onSortOrderChange,
  onScopeChange,
  onKindChange,
  onReset,
}: UpcomingTimelineFilterSheetProps) {
  return (
    <MobileFilterSheet
      visible={visible}
      onClose={onClose}
      title={t('common.filter')}
      activeCount={activeCount}
      sortField={upcomingSortField}
      sortOrder={upcomingSortOrder}
      onSortFieldChange={onSortFieldChange}
      onSortOrderChange={onSortOrderChange}
      sortOptions={[
        { id: 'date', label: t('common.date') || 'Date' },
        { id: 'name', label: t('common.name') || 'Name' },
        { id: 'amount', label: t('common.amount') || 'Amount' },
      ]}
      sections={[
        {
          id: 'scope',
          title: t('settings.household'),
          options: [
            { id: 'ALL', label: t('transactions.filterAll') || 'All' },
            { id: 'SHARED', label: t('categories.householdBadge').replace(/[()]/g, '') || 'Shared' },
            { id: 'PRIVATE', label: t('categories.privateBadge').replace(/[()]/g, '') || 'Private' },
          ],
          selectedValue: upcomingScopeFilter,
          onSelect: onScopeChange,
        },
        {
          id: 'kind',
          title: t('transactions.type') || 'Kind',
          options: [
            { id: 'ALL', label: t('transactions.filterAll') || 'All' },
            { id: 'INCOME', label: t('badges.income') || 'Income' },
            { id: 'EXPENSE', label: t('badges.bill') || 'Expense' },
            { id: 'TRANSFER', label: t('common.transfer') || 'Transfer' },
          ],
          selectedValue: upcomingKindFilter,
          onSelect: onKindChange,
        },
      ]}
      onReset={onReset}
    />
  );
}
