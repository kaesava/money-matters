import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  DESIGN_TOKENS,
  SegmentedTabs,
  FormErrorBanner,
  showMobileConfirm,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../lib/format';
import { CrossBankTransferModal } from './CrossBankTransferModal';
import {
  useMobileQuickAction,
  QuickActionType,
} from './quick/useMobileQuickAction';
export type { QuickActionType };
import { QuickExpenseTab } from './quick/QuickExpenseTab';
import { QuickIncomeTab } from './quick/QuickIncomeTab';
import { QuickTransferTab } from './quick/QuickTransferTab';

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
  const router = useRouter();
  const state = useMobileQuickAction(visible, initialType, initialSourcePoolId);

  const resetAndClose = () => {
    state.setName('');
    state.setAmount('');
    state.setDate(state.todayStr);
    state.setNote('');
    state.setDestPoolId('');
    state.setReceivingAccountId('');
    state.setGeneralError('');
    onSuccess?.();
    onClose();
  };

  const handleExpenseSubmit = async (skipBalanceCheck = false) => {
    state.setGeneralError('');
    const numAmount = parseFloat(state.amount);
    const selectedPool = state.pools.find((p) => p.id === state.selectedPoolId);
    const poolBal = typeof selectedPool?.currentBalance === 'number'
      ? selectedPool.currentBalance
      : parseFloat(String(selectedPool?.currentBalance || '0'));

    if (!skipBalanceCheck && state.date <= state.todayStr && numAmount > poolBal && selectedPool) {
      showMobileConfirm({
        title: 'Insufficient Pool Balance',
        message: `Expense of ${formatAUD(numAmount)} exceeds available "${selectedPool.name}" pool balance (${formatAUD(poolBal)}). Proceed?`,
        confirmText: t('common.proceed'),
        isDestructive: false,
        onConfirm: () => handleExpenseSubmit(true),
      });
      return;
    }

    state.setIsSubmitting(true);
    try {
      if (state.date > state.todayStr) {
        await state.createExpenseSourceMut.mutateAsync({
          name: state.name.trim(),
          amount: numAmount.toFixed(2),
          poolId: state.selectedPoolId,
          categoryId: state.selectedSubCategoryId || undefined,
          isRecurring: false,
          startDate: state.date.trim(),
        });
      } else {
        await state.recordExpenseMutation.mutateAsync({
          poolId: state.selectedPoolId,
          categoryId: state.selectedSubCategoryId || undefined,
          amount: numAmount.toFixed(2),
          flowType: 'DEBIT',
          date: state.date.trim(),
          note: state.name.trim(),
          idempotencyKey: crypto.randomUUID(),
        });
      }
      state.posthog?.capture('expense_recorded', {
        amount: numAmount,
        pool_id: state.selectedPoolId,
      });
      state.utils.listPools.invalidate();
      state.utils.listTransactions.invalidate();
      state.utils.listExpenseSources.invalidate();
      resetAndClose();
    } catch (err) {
      state.setGeneralError(
        err instanceof Error ? err.message : t('drawers.quickExpense.failedRecordExpense')
      );
    } finally {
      state.setIsSubmitting(false);
    }
  };

  const handleIncomeSubmit = async (splitImmediately: boolean) => {
    state.setGeneralError('');
    const numAmount = parseFloat(state.amount);
    state.setIsSubmitting(true);
    try {
      const created = await state.createIncomeSourceMut.mutateAsync({
        name: state.name.trim(),
        amount: numAmount.toFixed(2),
        isRecurring: false,
        startDate: state.date.trim(),
        receivingAccountId: state.receivingAccountId || undefined,
      });

      state.posthog?.capture('income_recorded', { amount: numAmount });
      state.utils.listPools.invalidate();
      state.utils.listIncomeEvents.invalidate();
      state.utils.listIncomeSources.invalidate();
      resetAndClose();

      if (splitImmediately && created?.firstEventId) {
        if (onIncomeSuccess) {
          onIncomeSuccess(created.firstEventId);
        } else {
          router.push(`/(app)/paychecks/${created.firstEventId}` as never);
        }
      }
    } catch (err) {
      state.setGeneralError(
        err instanceof Error ? err.message : t('drawers.quickExpense.failedRecordIncome')
      );
    } finally {
      state.setIsSubmitting(false);
    }
  };

  const handleTransferSubmit = async () => {
    state.setGeneralError('');
    const numAmount = parseFloat(state.amount);
    state.setIsSubmitting(true);
    const srcPool = state.pools.find((p) => p.id === state.selectedPoolId);
    const dstPool = state.pools.find((p) => p.id === state.destPoolId);
    const resolvedName = state.name.trim() || (srcPool && dstPool ? `${srcPool.name} ➔ ${dstPool.name}` : 'Transfer');

    try {
      if (state.date > state.todayStr) {
        await state.createTransferSourceMut.mutateAsync({
          name: resolvedName,
          sourcePoolId: state.selectedPoolId,
          destinationPoolId: state.destPoolId,
          amount: numAmount.toFixed(2),
          startDate: state.date.trim(),
        });
      } else {
        await state.moveMoneyMutation.mutateAsync({
          sourcePoolId: state.selectedPoolId,
          destinationPoolId: state.destPoolId,
          amount: numAmount.toFixed(2),
          targetDate: undefined,
          note: resolvedName,
        });
      }

      state.utils.listPools.invalidate();
      state.utils.listTransactions.invalidate();

      const srcAccount = state.bankAccounts?.find(
        (b) => b.id === state.pools.find((p) => p.id === state.selectedPoolId)?.bankAccountId
      );
      const dstAccount = state.bankAccounts?.find(
        (b) => b.id === state.pools.find((p) => p.id === state.destPoolId)?.bankAccountId
      );

      if (!(state.date > state.todayStr) && srcAccount && dstAccount && srcAccount.id !== dstAccount.id) {
        state.setCrossBankData({
          visible: true,
          sourceAccountName: srcAccount.name,
          destAccountName: dstAccount.name,
          amount: numAmount,
        });
      } else {
        resetAndClose();
      }
    } catch (err) {
      state.setGeneralError(
        err instanceof Error ? err.message : t('drawers.quickExpense.failedTransferFunds')
      );
    } finally {
      state.setIsSubmitting(false);
    }
  };

  const titleText =
    state.type === 'TRANSFER'
      ? t('drawers.quickExpense.transferBetweenPools')
      : state.type === 'CREDIT'
      ? t('drawers.quickExpense.oneOffIncome')
      : t('drawers.quickExpense.oneOffExpense');

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{titleText}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={20} color={DESIGN_TOKENS.colors.textMuted} />
              </TouchableOpacity>
            </View>

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
                  onCancel={onClose}
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
                  onCancel={onClose}
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
                  onCancel={onClose}
                />
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: D.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: D.colors.primary,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    paddingTop: 12,
  },
});
