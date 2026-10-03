import React from 'react';
import { MobileFilterSheet } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export type PoolSortField = 'name' | 'currentBalance' | 'targetAmount';
export type PoolTypeFilter = 'ALL' | 'EVERYDAY' | 'REGULAR' | 'GOAL';
export type PrivacyFilter = 'ALL' | 'SHARED' | 'PRIVATE';

interface PoolsFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  activeCount: number;
  sortField: PoolSortField;
  sortOrder: 'asc' | 'desc';
  typeFilter: PoolTypeFilter;
  privacyFilter: PrivacyFilter;
  onSortFieldChange: (field: PoolSortField) => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onTypeFilterChange: (type: PoolTypeFilter) => void;
  onPrivacyFilterChange: (privacy: PrivacyFilter) => void;
  onReset: () => void;
}

export function PoolsFilterSheet({
  visible,
  onClose,
  activeCount,
  sortField,
  sortOrder,
  typeFilter,
  privacyFilter,
  onSortFieldChange,
  onSortOrderChange,
  onTypeFilterChange,
  onPrivacyFilterChange,
  onReset,
}: PoolsFilterSheetProps) {
  return (
    <MobileFilterSheet
      visible={visible}
      onClose={onClose}
      title={t('common.filter')}
      activeCount={activeCount}
      sortField={sortField}
      sortOrder={sortOrder}
      onSortFieldChange={(f) => onSortFieldChange(f as PoolSortField)}
      onSortOrderChange={onSortOrderChange}
      sortOptions={[
        { id: 'name', label: t('common.name') },
        { id: 'currentBalance', label: t('categories.currentBalance') },
        { id: 'targetAmount', label: t('categories.targetAmountLabel') },
      ]}
      sections={[
        {
          id: 'type',
          title: t('categories.poolTypeLabel'),
          options: [
            { id: 'ALL', label: t('transactions.filterAll') },
            { id: 'EVERYDAY', label: t('poolTypes.everyday') },
            { id: 'REGULAR', label: t('poolTypes.bills') },
            { id: 'GOAL', label: t('poolTypes.goals') },
          ],
          selectedValue: typeFilter,
          onSelect: (val) => onTypeFilterChange(val as PoolTypeFilter),
        },
        {
          id: 'scope',
          title: t('settings.household.title'),
          options: [
            { id: 'ALL', label: t('transactions.filterAll') },
            { id: 'SHARED', label: t('categories.householdBadge').replace(/[()]/g, '') },
            { id: 'PRIVATE', label: t('categories.privateBadge').replace(/[()]/g, '') },
          ],
          selectedValue: privacyFilter,
          onSelect: (val) => onPrivacyFilterChange(val as PrivacyFilter),
        },
      ]}
      onReset={onReset}
    />
  );
}
