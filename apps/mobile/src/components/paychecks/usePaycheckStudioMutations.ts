import { trpc } from '../../lib/trpc';
import { useRouter } from 'expo-router';
import { useMobileToast, showMobileConfirm } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { triggerHaptic } from '../../lib/haptics';
import { AllocationLineItem } from './MobileIncomeSplitPoolList';

interface UsePaycheckStudioMutationsParams {
  id: string | undefined;
  sourceName: string;
  actualAmount: string;
  selectedDate: string;
  linesMap: Record<string, string>;
  reasoningMap: Record<string, string>;
  sweepPool: { id: string; name: string } | undefined;
  sweepPoolRemainder: number;
  numericActual: number;
  lines: AllocationLineItem[];
  setIsSavedPlan: (v: boolean) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  isDeficit: boolean;
}

export function usePaycheckStudioMutations({
  id,
  sourceName,
  actualAmount,
  selectedDate,
  linesMap,
  reasoningMap,
  sweepPool,
  sweepPoolRemainder,
  numericActual,
  lines,
  setIsSavedPlan,
  submitting,
  setSubmitting,
  isDeficit,
}: UsePaycheckStudioMutationsParams) {
  const toast = useMobileToast();
  const router = useRouter();
  const utils = trpc.useUtils();

  const confirmPaydayMut = trpc.confirmPayday.useMutation();
  const overrideEventMut = trpc.overrideEvent.useMutation();
  const saveBulkAllocationsMut = trpc.saveBulkAllocations.useMutation();
  const deleteIncomeMut = trpc.deleteIncomeEvent.useMutation();

  const handleRecalculateWaterfall = async () => {
    try {
      setSubmitting(true);
      await overrideEventMut.mutateAsync({
        eventId: id!,
        eventType: 'INCOME',
        name: sourceName,
        actualAmount: parseFloat(actualAmount).toFixed(2),
        actualDate: selectedDate,
        expectedAmount: parseFloat(actualAmount).toFixed(2),
        expectedDate: selectedDate,
      });
      await utils.previewPayday.invalidate({ incomeEventId: id! });
      toast.success(t('paydayDrawer.recalculateSuccess'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('paydayDrawer.recalculateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIncome = () => {
    showMobileConfirm({
      title: t('common.deleteIncomeTitle'),
      message: t('paydayDrawer.deleteDescription'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          setSubmitting(true);
          await deleteIncomeMut.mutateAsync({ eventId: id! });
          toast.success(t('paydayDrawer.incomeDeleted'));
          await utils.listIncomeEvents.invalidate();
          router.back();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('paydayDrawer.deleteFailed'));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const handleSaveSplit = async () => {
    if (isDeficit || submitting) return;
    setSubmitting(true);
    try {
      await overrideEventMut.mutateAsync({
        eventId: id!,
        eventType: 'INCOME',
        name: sourceName,
        actualAmount: parseFloat(actualAmount).toFixed(2),
        actualDate: selectedDate,
        expectedAmount: parseFloat(actualAmount).toFixed(2),
        expectedDate: selectedDate,
      });

      const effectiveMap = { ...linesMap };
      if (sweepPool) effectiveMap[sweepPool.id] = sweepPoolRemainder.toFixed(2);
      const payload = Object.entries(effectiveMap).map(([pId, val]) => {
        const amt = parseFloat(val) || 0;
        return {
          poolId: pId,
          proposedAmount: amt.toFixed(2),
          reasoning: amt <= 0 ? undefined : (reasoningMap[pId] ?? (lines.find((l) => l.bucketId === pId)?.reasoning || undefined)),
        };
      });

      await saveBulkAllocationsMut.mutateAsync({
        incomeEventId: id!,
        totalIncomeAmount: numericActual.toFixed(2),
        lines: payload,
      });

      setIsSavedPlan(true);
      toast.success(t('matrix.saveSplitSuccess'));
      await utils.listIncomeEvents.invalidate();
      await utils.listAllAllocationPlans.invalidate();
      router.back();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('paydayDrawer.saveSplitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSplit = () => {
    if (isDeficit || submitting) return;
    showMobileConfirm({
      title: t('paydayDrawer.confirmWarningTitle'),
      message: t('paydayDrawer.confirmWarningDescription'),
      confirmText: t('paydayDrawer.confirmWarningConfirm'),
      cancelText: t('common.cancel'),
      isDestructive: false,
      onConfirm: async () => {
        setSubmitting(true);
        try {
          await overrideEventMut.mutateAsync({
            eventId: id!,
            eventType: 'INCOME',
            name: sourceName,
            actualAmount: parseFloat(actualAmount).toFixed(2),
            actualDate: selectedDate,
            expectedAmount: parseFloat(actualAmount).toFixed(2),
            expectedDate: selectedDate,
          });

          const effectiveMap = { ...linesMap };
          if (sweepPool) effectiveMap[sweepPool.id] = sweepPoolRemainder.toFixed(2);
          const payload = Object.entries(effectiveMap).map(([pId, val]) => {
            const amt = parseFloat(val) || 0;
            return {
              poolId: pId,
              amount: amt.toFixed(2),
              reasoning: amt <= 0 ? undefined : (reasoningMap[pId] ?? (lines.find((l) => l.bucketId === pId)?.reasoning || undefined)),
            };
          });

          await confirmPaydayMut.mutateAsync({
            incomeEventId: id!,
            actualAmount: numericActual.toFixed(2),
            markAsReceivedToday: false,
            lines: payload,
          });

          triggerHaptic('success');
          toast.success(t('paydayDrawer.confirmSuccess'));
          await utils.listIncomeEvents.invalidate();
          await utils.listPools.invalidate();
          await utils.listTransactions.invalidate();
          await utils.getMonthlySummary.invalidate();

          router.replace({
            pathname: '/(app)/paychecks/transfer-instructions',
            params: { incomeEventId: id },
          } as never);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('paydayDrawer.confirmSplitFailed'));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  return {
    handleRecalculateWaterfall,
    handleDeleteIncome,
    handleSaveSplit,
    handleConfirmSplit,
  };
}
