import React from 'react';
import { MobileFilterSheet, FilterSection } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface PoolItem {
  id: string;
  name: string;
}

interface BankItem {
  id: string;
  name: string;
}

interface HistoryFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  flowFilter: 'ALL' | 'DEBIT' | 'CREDIT' | 'TRANSFER';
  onSelectFlow: (f: 'ALL' | 'DEBIT' | 'CREDIT' | 'TRANSFER') => void;
  selectedPoolId: string;
  onSelectPool: (id: string) => void;
  selectedBankAccountId: string;
  onSelectBank: (id: string) => void;
  sortField: 'recordedAt' | 'amount' | 'description';
  sortDir: 'asc' | 'desc';
  onSortFieldChange: (field: 'recordedAt' | 'amount' | 'description') => void;
  onSortDirChange: (dir: 'asc' | 'desc') => void;
  pools: PoolItem[];
  bankAccounts: BankItem[];
  onReset: () => void;
  activeCount: number;
}

export function HistoryFilterSheet({
  visible,
  onClose,
  flowFilter,
  onSelectFlow,
  selectedPoolId,
  onSelectPool,
  selectedBankAccountId,
  onSelectBank,
  sortField,
  sortDir,
  onSortFieldChange,
  onSortDirChange,
  pools,
  bankAccounts,
  onReset,
  activeCount,
}: HistoryFilterSheetProps) {
  const sections: FilterSection<any>[] = [
    {
      id: 'flow',
      title: t('transactions.type'),
      options: [
        { id: 'ALL', label: t('transactions.filterAll') },
        { id: 'CREDIT', label: t('common.income') },
        { id: 'DEBIT', label: t('common.expense') },
        { id: 'TRANSFER', label: t('common.transfer') },
      ],
      selectedValue: flowFilter,
      onSelect: onSelectFlow,
    },
    {
      id: 'pool',
      title: t('categories.typeLabel'),
      options: [
        { id: 'ALL', label: t('transactions.allPools') },
        ...pools.map((p) => ({ id: p.id, label: p.name })),
      ],
      selectedValue: selectedPoolId,
      onSelect: onSelectPool,
    },
    {
      id: 'bank',
      title: t('bankAccounts.title'),
      options: [
        { id: 'ALL', label: t('transactions.allBanks') },
        ...bankAccounts.map((b) => ({ id: b.id, label: b.name })),
      ],
      selectedValue: selectedBankAccountId,
      onSelect: onSelectBank,
    },
  ];

  return (
    <MobileFilterSheet
      visible={visible}
      onClose={onClose}
      title={t('common.filter')}
      activeCount={activeCount}
      sortField={sortField}
      sortOrder={sortDir}
      onSortFieldChange={onSortFieldChange}
      onSortOrderChange={onSortDirChange}
      sortOptions={[
        { id: 'recordedAt', label: t('transactions.sortByDate') },
        { id: 'amount', label: t('transactions.sortByAmount') },
        { id: 'description', label: t('common.description') },
      ]}
      sections={sections}
      onReset={onReset}
    />
  );
}
