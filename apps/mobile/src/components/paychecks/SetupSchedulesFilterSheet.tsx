import React from 'react';
import { MobileFilterSheet } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export interface SetupSchedulesFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  activeSubSegment: 'INCOME' | 'EXPENSE';
  sortField: 'name' | 'amount' | 'date';
  sortOrder: 'asc' | 'desc';
  onSortFieldChange: (field: string) => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  selectedBankId: string;
  onBankChange: (bankId: string) => void;
  bankAccounts: { id: string; name: string }[];
  selectedPoolId: string;
  onPoolChange: (poolId: string) => void;
  pools: { id: string; name: string }[];
  onReset: () => void;
}

export function SetupSchedulesFilterSheet({
  visible,
  onClose,
  activeSubSegment,
  sortField,
  sortOrder,
  onSortFieldChange,
  onSortOrderChange,
  selectedBankId,
  onBankChange,
  bankAccounts,
  selectedPoolId,
  onPoolChange,
  pools,
  onReset,
}: SetupSchedulesFilterSheetProps) {
  const isIncome = activeSubSegment === 'INCOME';
  const activeCount = isIncome
    ? (selectedBankId !== 'ALL' ? 1 : 0)
    : (selectedPoolId !== 'ALL' ? 1 : 0);

  const sections = isIncome
    ? [
        {
          id: 'bank',
          title: t('bankAccounts.title') || 'Bank Accounts',
          options: [
            { id: 'ALL', label: t('transactions.allBanks') || 'All Bank Accounts' },
            ...bankAccounts.map((b) => ({ id: b.id, label: b.name })),
          ],
          selectedValue: selectedBankId,
          onSelect: onBankChange,
        },
      ]
    : [
        {
          id: 'pool',
          title: t('categories.typeLabel') || 'Pool',
          options: [
            { id: 'ALL', label: t('transactions.allPools') || 'All Pools' },
            ...pools.map((p) => ({ id: p.id, label: p.name })),
          ],
          selectedValue: selectedPoolId,
          onSelect: onPoolChange,
        },
      ];

  return (
    <MobileFilterSheet
      visible={visible}
      onClose={onClose}
      title={t('common.filter')}
      activeCount={activeCount}
      sortField={sortField}
      sortOrder={sortOrder}
      onSortFieldChange={onSortFieldChange}
      onSortOrderChange={onSortOrderChange}
      sortOptions={[
        { id: 'name', label: t('common.name') || 'Name' },
        { id: 'amount', label: t('common.amount') || 'Amount' },
        { id: 'date', label: t('common.date') || 'Date' },
      ]}
      sections={sections}
      onReset={onReset}
    />
  );
}
