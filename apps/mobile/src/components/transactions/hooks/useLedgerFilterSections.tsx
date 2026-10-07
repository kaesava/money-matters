import { useMemo } from 'react';
import { t } from '@money-matters/i18n';
import { FilterSection, MobilePoolPicker, MobileBankPicker } from '@money-matters/ui/mobile';

interface PoolOption {
  id: string;
  name: string;
  poolType?: string;
  currentBalance?: string | number;
}

interface BankOption {
  id: string;
  name: string;
  bankProvider?: string;
  balance?: string | number;
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
        renderCustom: () => (
          <MobilePoolPicker
            pools={pools.map((p) => ({
              id: p.id,
              name: p.name,
              poolType: p.poolType,
              currentBalance: p.currentBalance,
            }))}
            selectedPoolId={selectedPoolId}
            onSelectPool={(id) => {
              onPoolChange(id);
              onPageChange(1);
            }}
            allowAllOption={true}
          />
        ),
      },
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
            selectedBankId={selectedBankAccountId}
            onSelectBank={(id) => {
              onBankChange(id);
              onPageChange(1);
            }}
            allowAllOption={true}
          />
        ),
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
