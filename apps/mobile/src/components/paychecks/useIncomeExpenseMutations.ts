import { trpc } from '../../lib/trpc';
import { useMobileToast, showMobileConfirm } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { SourceToEdit } from '../IncomeExpenseFormModal';

const getSydneyTodayString = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());

interface UseIncomeExpenseMutationsProps {
  mode: 'INCOME' | 'EXPENSE';
  isEdit: boolean;
  sourceToEdit?: SourceToEdit | null;
  onSuccess?: () => void;
  onClose: () => void;
}

export function useIncomeExpenseMutations({
  mode,
  isEdit,
  sourceToEdit,
  onSuccess,
  onClose,
}: UseIncomeExpenseMutationsProps) {
  const toast = useMobileToast();

  const createIncomeMut = trpc.createIncomeSource.useMutation();
  const updateIncomeMut = trpc.updateIncomeSource.useMutation();
  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation();

  const createEnvelopeMut = trpc.createEnvelope.useMutation();
  const updateEnvelopeMut = trpc.updateEnvelope.useMutation();
  const archiveEnvelopeMut = trpc.archiveEnvelope.useMutation();
  const createOneOffExpenseMut = trpc.createOneOffExpense.useMutation();

  const isPending =
    createIncomeMut.isPending ||
    updateIncomeMut.isPending ||
    archiveIncomeMut.isPending ||
    createEnvelopeMut.isPending ||
    updateEnvelopeMut.isPending ||
    archiveEnvelopeMut.isPending ||
    createOneOffExpenseMut.isPending;

  const handleArchive = () => {
    if (!sourceToEdit) return;
    showMobileConfirm({
      title:
        mode === 'INCOME'
          ? t('modals.incomeExpenseForm.archiveIncomeTitle')
          : t('modals.incomeExpenseForm.archiveExpenseTitle'),
      message:
        mode === 'INCOME'
          ? t('modals.incomeExpenseForm.archiveIncomeConfirm')
          : t('modals.incomeExpenseForm.archiveExpenseConfirm'),
      confirmText: t('modals.incomeExpenseForm.archiveSchedule'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          if (mode === 'INCOME') {
            await archiveIncomeMut.mutateAsync({ id: sourceToEdit.id });
          } else {
            await archiveEnvelopeMut.mutateAsync({ envelopeId: sourceToEdit.id });
          }
          toast.success(t('toasts.archived'));
          onSuccess?.();
          onClose();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('modals.incomeExpenseForm.failedToArchive'));
        }
      },
    });
  };

  const executeSave = async (params: {
    name: string;
    amount: string;
    receivingAccountId: string;
    poolId: string;
    categoryId: string | null;
    isRecurring: boolean;
    frequency?: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY';
    interval?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    const formattedAmount = parseFloat(params.amount).toFixed(2);
    try {
      if (mode === 'INCOME') {
        if (isEdit && sourceToEdit) {
          await updateIncomeMut.mutateAsync({
            id: sourceToEdit.id,
            data: {
              name: params.name.trim(),
              amount: formattedAmount,
              receivingAccountId: params.receivingAccountId || undefined,
              isRecurring: params.isRecurring,
              frequency: params.isRecurring ? params.frequency : undefined,
              interval: params.isRecurring ? (params.interval || 1) : undefined,
              startDate: params.startDate || undefined,
              endDate: params.isRecurring && params.endDate ? params.endDate : undefined,
            },
          });
          toast.success(t('toasts.saved'));
        } else {
          await createIncomeMut.mutateAsync({
            name: params.name.trim(),
            amount: formattedAmount,
            receivingAccountId: params.receivingAccountId || undefined,
            isRecurring: params.isRecurring,
            frequency: params.isRecurring ? params.frequency : undefined,
            interval: params.isRecurring ? (params.interval || 1) : undefined,
            startDate: params.startDate || undefined,
            endDate: params.isRecurring && params.endDate ? params.endDate : undefined,
          });
          toast.success(t('toasts.saved'));
        }
      } else {
        if (!params.isRecurring) {
          await createOneOffExpenseMut.mutateAsync({
            name: params.name.trim(),
            amount: formattedAmount,
            envelopeId: params.poolId,
            expectedDate: params.startDate || getSydneyTodayString(),
          });
          toast.success(t('toasts.saved'));
        } else if (isEdit && sourceToEdit) {
          await updateEnvelopeMut.mutateAsync({
            envelopeId: sourceToEdit.id,
            data: {
              name: params.name.trim(),
              targetAmount: formattedAmount,
              budgetFrequency: params.frequency || 'MONTHLY',
              startDate: params.startDate || undefined,
              endDate: params.endDate || undefined,
            },
          });
          toast.success(t('toasts.saved'));
        } else {
          await createEnvelopeMut.mutateAsync({
            name: params.name.trim(),
            envelopeType: 'SCHEDULED_BILL',
            bankAccountId: params.poolId,
            targetAmount: formattedAmount,
            budgetFrequency: params.frequency || 'MONTHLY',
            startDate: params.startDate || undefined,
            endDate: params.endDate || undefined,
          });
          toast.success(t('toasts.saved'));
        }
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  return {
    isPending,
    handleArchive,
    executeSave,
  };
}
