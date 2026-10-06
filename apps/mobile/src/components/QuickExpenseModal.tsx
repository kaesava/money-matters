import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import {
  SegmentedTabs,
  FormErrorBanner,
  MobileModalDialog,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { CrossBankTransferModal } from './CrossBankTransferModal';
import {
  useMobileQuickAction,
  QuickActionType,
} from './quick/useMobileQuickAction';
export type { QuickActionType };
import { QuickExpenseTab } from './quick/QuickExpenseTab';
import { QuickIncomeTab } from './quick/QuickIncomeTab';
import { QuickTransferTab } from './quick/QuickTransferTab';
import { useQuickExpenseSubmissions } from './quick/useQuickExpenseSubmissions';

interface QuickExpenseModalProps {
  visible: boolean;
  initialType?: QuickActionType;
  initialSourcePoolId?: string;
  onClose: () => void;
  onSuccess?: () => void;
  onIncomeSuccess?: (incomeEventId: string) => void;
}

export function QuickExpenseModal({
  visible,
  initialType = 'DEBIT',
  initialSourcePoolId,
  onClose,
  onSuccess,
  onIncomeSuccess,
}: QuickExpenseModalProps) {
  const state = useMobileQuickAction(visible, initialType, initialSourcePoolId);

  const isDirty = useMemo(() => {
    return (
      state.name.trim().length > 0 ||
      state.amount.trim().length > 0 ||
      state.selectedPoolId.length > 0 ||
      Boolean(state.destPoolId) ||
      Boolean(state.receivingAccountId) ||
      state.date !== state.todayStr
    );
  }, [
    state.name,
    state.amount,
    state.selectedPoolId,
    state.destPoolId,
    state.receivingAccountId,
    state.date,
    state.todayStr,
  ]);

  const invalidateAllQueries = () => {
    state.utils.listPools.invalidate();
    state.utils.listCategories.invalidate();
    state.utils.listTransactions.invalidate();
    state.utils.listExpenseSources.invalidate();
    state.utils.listExpenseEvents.invalidate();
    state.utils.listIncomeSources.invalidate();
    state.utils.listIncomeEvents.invalidate();
    state.utils.listTransferEvents.invalidate();
    state.utils.listBankAccountsWithExpected.invalidate();
  };

  const resetAndClose = () => {
    state.setName('');
    state.setAmount('');
    state.setDate(state.todayStr);
    state.setSelectedPoolId('');
    state.setSelectedSubCategoryId(null);
    state.setNote('');
    state.setDestPoolId('');
    state.setReceivingAccountId('');
    state.setGeneralError('');
    onSuccess?.();
    onClose();
  };

  const { handleExpenseSubmit, handleIncomeSubmit, handleTransferSubmit } =
    useQuickExpenseSubmissions({
      state,
      onSuccess,
      onIncomeSuccess,
      resetAndClose,
      invalidateAllQueries,
    });

  const titleText =
    state.type === 'TRANSFER'
      ? t('drawers.quickExpense.transferBetweenPools')
      : state.type === 'CREDIT'
      ? t('drawers.quickExpense.oneOffIncome')
      : t('drawers.quickExpense.oneOffExpense');

  return (
    <>
      <MobileModalDialog
        visible={visible}
        onClose={resetAndClose}
        title={titleText}
        isDirty={isDirty}
      >
        <SegmentedTabs<QuickActionType>
          tabs={[
            { key: 'DEBIT', label: t('drawers.quickExpense.tabExpense') },
            { key: 'CREDIT', label: t('drawers.quickExpense.tabIncome') },
            { key: 'TRANSFER', label: t('drawers.quickExpense.tabTransfer') },
          ]}
          activeKey={state.type}
          onChange={state.setType}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          <FormErrorBanner message={state.generalError} />

          {state.type === 'DEBIT' && (
            <QuickExpenseTab
              name={state.name}
              setName={state.setName}
              amount={state.amount}
              setAmount={state.setAmount}
              date={state.date}
              setDate={state.setDate}
              todayStr={state.todayStr}
              selectedPoolId={state.selectedPoolId}
              setSelectedPoolId={state.setSelectedPoolId}
              selectedSubCategoryId={state.selectedSubCategoryId}
              setSelectedSubCategoryId={state.setSelectedSubCategoryId}
              pools={state.pools}
              categories={state.rawCategories}
              presets={state.expensePresets}
              onSelectPreset={state.handleSelectPreset}
              isSubmitting={state.isSubmitting}
              onSubmit={handleExpenseSubmit}
              onCancel={resetAndClose}
            />
          )}

          {state.type === 'CREDIT' && (
            <QuickIncomeTab
              name={state.name}
              setName={state.setName}
              amount={state.amount}
              setAmount={state.setAmount}
              date={state.date}
              setDate={state.setDate}
              receivingAccountId={state.receivingAccountId}
              setReceivingAccountId={state.setReceivingAccountId}
              bankAccounts={state.bankAccounts}
              presets={state.incomePresets}
              onSelectPreset={state.handleSelectPreset}
              isSubmitting={state.isSubmitting}
              onSubmit={handleIncomeSubmit}
              onCancel={resetAndClose}
            />
          )}

          {state.type === 'TRANSFER' && (
            <QuickTransferTab
              name={state.name}
              setName={state.setName}
              amount={state.amount}
              setAmount={state.setAmount}
              date={state.date}
              setDate={state.setDate}
              todayStr={state.todayStr}
              sourcePoolId={state.selectedPoolId}
              setSourcePoolId={state.setSelectedPoolId}
              destPoolId={state.destPoolId}
              setDestPoolId={state.setDestPoolId}
              pools={state.pools}
              presets={state.transferPresets}
              onSelectPreset={state.handleSelectPreset}
              isSubmitting={state.isSubmitting}
              onSubmit={handleTransferSubmit}
              onCancel={resetAndClose}
            />
          )}
        </ScrollView>
      </MobileModalDialog>

      {state.crossBankData && (
        <CrossBankTransferModal
          visible={state.crossBankData.visible}
          onClose={() => {
            state.setCrossBankData(null);
            resetAndClose();
          }}
          sourceAccountName={state.crossBankData.sourceAccountName}
          destAccountName={state.crossBankData.destAccountName}
          amount={state.crossBankData.amount}
        />
      )}
    </>
  );
}

export default QuickExpenseModal;

const styles = StyleSheet.create({
  body: {
    paddingTop: 12,
  },
});
