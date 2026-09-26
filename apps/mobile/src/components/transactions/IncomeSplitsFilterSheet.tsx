import React from 'react';
import { MobileFilterSheet, FilterSection } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface BankItem {
  id: string;
  name: string;
}

interface IncomeSplitsFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedBankId: string;
  onSelectBank: (id: string) => void;
  sortField: 'createdAt' | 'expectedDate' | 'incomeName' | 'receivingAccount' | 'amount';
  sortDir: 'asc' | 'desc';
  onSortFieldChange: (field: 'createdAt' | 'expectedDate' | 'incomeName' | 'receivingAccount' | 'amount') => void;
  onSortDirChange: (dir: 'asc' | 'desc') => void;
  bankAccounts: BankItem[];
  onReset: () => void;
  activeCount: number;
}

export function IncomeSplitsFilterSheet({
  visible,
  onClose,
  selectedBankId,
  onSelectBank,
  sortField,
  sortDir,
  onSortFieldChange,
  onSortDirChange,
  bankAccounts,
  onReset,
  activeCount,
}: IncomeSplitsFilterSheetProps) {
  const sections: FilterSection<any>[] = [
    {
      id: 'bank',
      title: t('bankAccounts.title'),
      options: [
        { id: 'ALL', label: t('transactions.allBanks') },
        ...bankAccounts.map((b) => ({ id: b.id, label: b.name })),
      ],
      selectedValue: selectedBankId,
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
        { id: 'expectedDate', label: t('transactions.sortByDate') },
        { id: 'amount', label: t('transactions.sortByAmount') },
        { id: 'incomeName', label: t('common.description') },
      ]}
      sections={sections}
      onReset={onReset}
    />
  );
}
