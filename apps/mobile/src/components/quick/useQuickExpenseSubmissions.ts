import { useRouter } from 'expo-router';
import { useMobileToast, showMobileConfirm } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../lib/format';
import { useMobileQuickAction } from './useMobileQuickAction';

type QuickActionState = ReturnType<typeof useMobileQuickAction>;

interface UseQuickExpenseSubmissionsProps {
  state: QuickActionState;
  onSuccess?: () => void;
  onIncomeSuccess?: (incomeEventId: string) => void;
  resetAndClose: () => void;
  invalidateAllQueries: () => void;
}

export function useQuickExpenseSubmissions({
  state,
  onSuccess,
  onIncomeSuccess,
  resetAndClose,
  invalidateAllQueries,
}: UseQuickExpenseSubmissionsProps) {
  const router = useRouter();
  const toast = useMobileToast();

  const handleExpenseSubmit = async (skipBalanceCheck = false) => {
    state.setGeneralError('');
    const numAmount = parseFloat(state.amount);
    const selectedPool = state.pools.find((p) => p.id === state.selectedPoolId);
    const poolBal =
      typeof selectedPool?.currentBalance === 'number'
        ? selectedPool.currentBalance
        : parseFloat(String(selectedPool?.currentBalance || '0'));

    if (!skipBalanceCheck && state.date <= state.todayStr && numAmount > poolBal && selectedPool) {
      showMobileConfirm({
        title: t('incomeBillsTabs.insufficientModalTitle'),
        message: `Expense of ${formatAUD(numAmount)} exceeds available "${selectedPool.name}" pool balance (${formatAUD(poolBal)}). Proceed?`,
        confirmText: t('common.confirm'),
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
          date: state.date.trim(),
          note: state.name.trim(),
        });
      }
      state.posthog?.capture('expense_recorded', {
        amount: numAmount,
        pool_id: state.selectedPoolId,
      });
      invalidateAllQueries();
      toast.success(t('toasts.saved'));
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
      invalidateAllQueries();
      toast.success(t('toasts.saved'));
      resetAndClose();

      if (splitImmediately && created?.firstEventId) {
        if (onIncomeSuccess) {
          onIncomeSuccess(created.firstEventId);
        } else {
          router.push(`/(app)/income-split/${created.firstEventId}` as never);
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
    const resolvedName =
      state.name.trim() || (srcPool && dstPool ? `${srcPool.name} ➔ ${dstPool.name}` : 'Transfer');

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

      invalidateAllQueries();

      const srcAccount = state.bankAccounts?.find(
        (b) => b.id === state.pools.find((p) => p.id === state.selectedPoolId)?.bankAccountId
      );
      const dstAccount = state.bankAccounts?.find(
        (b) => b.id === state.pools.find((p) => p.id === state.destPoolId)?.bankAccountId
      );

      if (
        !(state.date > state.todayStr) &&
        srcAccount &&
        dstAccount &&
        srcAccount.id !== dstAccount.id
      ) {
        state.setCrossBankData({
          visible: true,
          sourceAccountName: srcAccount.name,
          destAccountName: dstAccount.name,
          amount: numAmount,
        });
      } else {
        toast.success(t('toasts.transferCompleted'));
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

  return { handleExpenseSubmit, handleIncomeSubmit, handleTransferSubmit };
}
