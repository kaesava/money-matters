import React from 'react';
import { MobileFilterSheet, MobileBankPicker } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import type { SpendingFlowType } from '@money-matters/types';

interface ReportsFilterSheetsProps {
  spendingFilterSheetVisible: boolean;
  onCloseSpendingFilter: () => void;
  spendingActiveFilterCount: number;
  spendingFlowType: SpendingFlowType;
  setSpendingFlowType: (val: SpendingFlowType) => void;
  spendingBankId: string;
  setSpendingBankId: (val: string) => void;
  spendingPoolId: string;
  setSpendingPoolId: (val: string) => void;
  planFilterSheetVisible: boolean;
  onClosePlanFilter: () => void;
  planActiveFilterCount: number;
  planBankId: string;
  setPlanBankId: (val: string) => void;
  bankAccounts: Array<{ id: string; name: string }>;
  pools: Array<{ id: string; name: string }>;
}

/**
 * Filter bottom sheets for the Spending and Payday Plans tabs on Mobile Reports.
 */
export function ReportsFilterSheets({
  spendingFilterSheetVisible,
  onCloseSpendingFilter,
  spendingActiveFilterCount,
  spendingFlowType,
  setSpendingFlowType,
  spendingBankId,
  setSpendingBankId,
  spendingPoolId,
  setSpendingPoolId,
  planFilterSheetVisible,
  onClosePlanFilter,
  planActiveFilterCount,
  planBankId,
  setPlanBankId,
  bankAccounts,
  pools,
}: ReportsFilterSheetsProps) {
  return (
    <>
      <MobileFilterSheet
        visible={spendingFilterSheetVisible}
        onClose={onCloseSpendingFilter}
        activeCount={spendingActiveFilterCount}
        sections={[
          {
            id: 'flowType',
            title: t('history.flowType'),
            options: [
              { id: 'ALL', label: t('reports.filters.allFlows') },
              { id: 'DEBIT', label: t('reports.filters.debitsOnly') },
              { id: 'CREDIT', label: t('reports.filters.creditsOnly') },
              { id: 'TRANSFER', label: t('reports.filters.transfersOnly') },
            ],
            selectedValue: spendingFlowType,
            onSelect: (id: string) => setSpendingFlowType(id as SpendingFlowType),
          },
          {
            id: 'bank',
            title: t('bankAccounts.title'),
            renderCustom: () => (
              <MobileBankPicker
                banks={bankAccounts.map((b) => ({ id: b.id, name: b.name }))}
                selectedBankId={spendingBankId}
                onSelectBank={setSpendingBankId}
                allowAllOption={true}
              />
            ),
          },
          {
            id: 'pool',
            title: t('categories.title'),
            options: [
              { id: 'ALL', label: t('reports.filters.allEnvelopes') },
              ...pools.map((p) => ({ id: p.id, label: p.name })),
            ],
            selectedValue: spendingPoolId,
            onSelect: (id: string) => setSpendingPoolId(id),
          },
        ]}
        onReset={() => {
          setSpendingFlowType('ALL');
          setSpendingBankId('ALL');
          setSpendingPoolId('ALL');
        }}
      />

      <MobileFilterSheet
        visible={planFilterSheetVisible}
        onClose={onClosePlanFilter}
        activeCount={planActiveFilterCount}
        sections={[
          {
            id: 'bank',
            title: t('bankAccounts.title'),
            renderCustom: () => (
              <MobileBankPicker
                banks={bankAccounts.map((b) => ({ id: b.id, name: b.name }))}
                selectedBankId={planBankId}
                onSelectBank={setPlanBankId}
                allowAllOption={true}
              />
            ),
          },
        ]}
        onReset={() => {
          setPlanBankId('ALL');
        }}
      />
    </>
  );
}
