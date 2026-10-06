import { useMemo } from 'react';
import { t } from '@money-matters/i18n';
import { FilterSection } from '@money-matters/ui/mobile';

interface PoolOption {
  id: string;
  name: string;
}

interface BankOption {
  id: string;
  name: string;
}

interface UseLedgerFilterSectionsProps {
  flowFilter: 'ALL' | 'DEBIT' | 'CREDIT';
  onFlowFilterChange: (flow: 'ALL' | 'DEBIT' | 'CREDIT') => void;
  selectedPoolId: string;
  onPoolChange: (id: string) => void;
  selectedBankAccountId: string;
  onBankChange: (id: string) => void;
  pools: PoolOption[];
  bankAccounts: BankOption[];
  onPageChange: (page: number) => void;
}

export function useLedgerFilterSections({
  flowFilter,
  onFlowFilterChange,
  selectedPoolId,
  onPoolChange,
  selectedBankAccountId,
  onBankChange,
  pools,
  bankAccounts,
  onPageChange,
}: UseLedgerFilterSectionsProps): FilterSection[] {
  return useMemo(
    () => [
      {
        id: 'flow',
        title: t('common.type'),
        selectedValue: flowFilter,
        onSelect: (val: string) => {
          onFlowFilterChange(val as 'ALL' | 'DEBIT' | 'CREDIT');
          onPageChange(1);
        },
        options: [
          { id: 'ALL', label: t('common.all') },
          { id: 'DEBIT', label: t('transactions.expenses') },
          { id: 'CREDIT', label: t('transactions.income') },
        ],
      },
      {
        id: 'pool',
        title: t('categories.title'),
        selectedValue: selectedPoolId,
        onSelect: (id: string) => {
          onPoolChange(id);
          onPageChange(1);
        },
        options: [
          { id: 'ALL', label: t('common.all') },
          ...pools.map((p) => ({ id: p.id, label: p.name })),
        ],
      },
      {
        id: 'bank',
        title: t('bankAccounts.title'),
        selectedValue: selectedBankAccountId,
        onSelect: (id: string) => {
          onBankChange(id);
          onPageChange(1);
        },
        options: [
          { id: 'ALL', label: t('common.all') },
          ...bankAccounts.map((b) => ({ id: b.id, label: b.name })),
        ],
      },
    ],
    [
      flowFilter,
      selectedPoolId,
      selectedBankAccountId,
      pools,
      bankAccounts,
      onFlowFilterChange,
      onPoolChange,
      onBankChange,
      onPageChange,
    ]
  );
}
