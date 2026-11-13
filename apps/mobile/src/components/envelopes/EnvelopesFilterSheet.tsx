import React from 'react';
import { MobileFilterSheet } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import type {
  PoolSortField,
  PoolTypeFilter,
  PrivacyFilter,
} from './useEnvelopesFilter';

interface EnvelopesFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  activeFilterCount: number;
  sortField: PoolSortField;
  sortOrder: 'asc' | 'desc';
  onSortFieldChange: (field: PoolSortField) => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  typeFilter: PoolTypeFilter;
  setTypeFilter: (val: PoolTypeFilter) => void;
  privacyFilter: PrivacyFilter;
  setPrivacyFilter: (val: PrivacyFilter) => void;
  onReset: () => void;
}

import { useAppFeatures } from '../../context/useAppFeatures';

export function EnvelopesFilterSheet({
  visible,
  onClose,
  activeFilterCount,
  sortField,
  sortOrder,
  onSortFieldChange,
  onSortOrderChange,
  typeFilter,
  setTypeFilter,
  privacyFilter,
  setPrivacyFilter,
  onReset,
}: EnvelopesFilterSheetProps) {
  const { hasPrivateMode } = useAppFeatures();

  const sections = [
    {
      id: 'type',
      title: t('categories.filterByType'),
      selectedValue: typeFilter,
      onSelect: (val: string) => setTypeFilter(val as PoolTypeFilter),
      options: [
        { id: 'ALL', label: t('common.all') },
        { id: 'EVERYDAY', label: t('poolTypes.everyday') },
        { id: 'BILL', label: t('poolTypes.bills') },
        { id: 'GOAL', label: t('poolTypes.goals') },
      ],
    },
    ...(hasPrivateMode
      ? [
          {
            id: 'privacy',
            title: t('categories.filterByPrivacy'),
            selectedValue: privacyFilter,
            onSelect: (val: string) => setPrivacyFilter(val as PrivacyFilter),
            options: [
              { id: 'ALL', label: t('common.all') },
              { id: 'SHARED', label: t('common.shared') },
              { id: 'PRIVATE', label: t('common.private') },
            ],
          },
        ]
      : []),
  ];

  return (
    <MobileFilterSheet
      visible={visible}
      onClose={onClose}
      activeCount={activeFilterCount}
      sortField={sortField}
      sortOrder={sortOrder}
      sortOptions={[
        { id: 'name', label: t('common.name') },
        { id: 'currentBalance', label: t('common.balance') },
        { id: 'targetAmount', label: t('common.target') },
      ]}
      onSortFieldChange={(field) => onSortFieldChange(field as PoolSortField)}
      onSortOrderChange={onSortOrderChange}
      sections={sections}
      onReset={onReset}
    />
  );
}
