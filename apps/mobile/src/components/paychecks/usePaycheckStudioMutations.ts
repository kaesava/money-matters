import { trpc } from '../../lib/trpc';
import { useRouter } from 'expo-router';
import { useMobileToast, showMobileConfirm } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { triggerHaptic } from '../../lib/haptics';
import { formatIsoDate } from '../../lib/format';
import {
  UsePaycheckStudioMutationsParams,
  buildAllocationsPayload,
  buildConfirmPayload,
  PaycheckStudioPreviewData,
} from './paycheck-studio-types';

export function usePaycheckStudioMutations({
  id,
  sourceName,
  actualAmount,
  selectedDate,
  linesMap,
  reasoningMap,
  initialLinesMap,
  initialReasoningMap,
  isSavedPlan,
  isReadOnly,
  previewQuery,
  sweepPool,
  sweepPoolRemainder,
  numericActual,
  lines,
  setIsSavedPlan,
  submitting,
  setSubmitting,
  isDeficit,
  onConfirmSuccess,
  onApplyFreshData,
  onSaveSuccess,
}: UsePaycheckStudioMutationsParams) {
  const toast = useMobileToast();
  const router = useRouter();
  const utils = trpc.useUtils();

  const confirmPaydayMut = trpc.confirmPayday.useMutation();
  const overrideEventMut = trpc.overrideEvent.useMutation();
  const saveBulkAllocationsMut = trpc.saveBulkAllocations.useMutation();
  const resetAllocationPlanMut = trpc.resetAllocationPlan.useMutation();
  const deleteIncomeMut = trpc.deleteIncomeEvent.useMutation();

  const handleResetPlan = async () => {
    try {
      setSubmitting(true);
      await resetAllocationPlanMut.mutateAsync({ incomeEventId: id! });
      setIsSavedPlan(false);
      const freshData = await utils.previewPayday.fetch({ incomeEventId: id! }, { staleTime: 0 });
      if (freshData && onApplyFreshData) onApplyFreshData(freshData as PaycheckStudioPreviewData);
      await Promise.all([utils.listIncomeEvents.invalidate(), utils.listAllAllocationPlans.invalidate()]);
      toast.success(t('paydayDrawer.recalculateSuccess'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('paydayDrawer.recalculateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

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
      if (isSavedPlan) {
        await resetAllocationPlanMut.mutateAsync({ incomeEventId: id! });
        setIsSavedPlan(false);
      }
      const freshData = await utils.previewPayday.fetch({ incomeEventId: id! }, { staleTime: 0 });
      if (freshData && onApplyFreshData) onApplyFreshData(freshData as PaycheckStudioPreviewData);
      await Promise.all([utils.listIncomeEvents.invalidate(), utils.listAllAllocationPlans.invalidate()]);
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

      const payload = buildAllocationsPayload(linesMap, reasoningMap, sweepPool, sweepPoolRemainder, lines);
      await saveBulkAllocationsMut.mutateAsync({
        incomeEventId: id!,
        totalIncomeAmount: numericActual.toFixed(2),
        lines: payload,
      });

      setIsSavedPlan(true);
      if (onSaveSuccess) onSaveSuccess();
      toast.success(t('matrix.lockSplitSuccess'));
      await Promise.all([
        utils.listIncomeEvents.invalidate(),
        utils.listAllAllocationPlans.invalidate(),
        utils.previewPayday.invalidate({ incomeEventId: id! }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('paydayDrawer.saveSplitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const executeAutoSave = async () => {
    if (!previewQuery.data || isReadOnly) return;
    const pData = previewQuery.data;
    const isEventDirty =
      sourceName !== (pData.incomeEventName || t('paydayDrawer.incomeDepositDefault')) ||
      actualAmount !== String(pData.actualAmount ?? pData.expectedAmount) ||
      selectedDate !== formatIsoDate(pData.expectedDate);

    const isAllocationsDirty =
      Object.entries(linesMap).some(([pId, val]) => initialLinesMap[pId] !== val) ||
      Object.entries(reasoningMap).some(([pId, val]) => initialReasoningMap[pId] !== val);

    if (!isEventDirty && !isAllocationsDirty) return;

    try {
      if (isEventDirty) {
        await overrideEventMut.mutateAsync({
          eventId: id!,
          eventType: 'INCOME',
          name: sourceName,
          actualAmount: parseFloat(actualAmount).toFixed(2),
          actualDate: selectedDate,
          expectedAmount: parseFloat(actualAmount).toFixed(2),
          expectedDate: selectedDate,
        });
      }

      if (isAllocationsDirty && !isDeficit) {
        const payload = buildAllocationsPayload(linesMap, reasoningMap, sweepPool, sweepPoolRemainder, lines);
        await saveBulkAllocationsMut.mutateAsync({
          incomeEventId: id!,
          totalIncomeAmount: numericActual.toFixed(2),
          lines: payload,
        });
        if (!isSavedPlan) toast.success(t('matrix.lockSplitSuccess'));
      }
    } catch {
      // Best effort auto-save
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

          const payload = buildConfirmPayload(linesMap, reasoningMap, sweepPool, sweepPoolRemainder, lines);
          await confirmPaydayMut.mutateAsync({
            incomeEventId: id!,
            actualAmount: numericActual.toFixed(2),
            markAsReceivedToday: false,
            lines: payload,
          });

          triggerHaptic('success');
          toast.success(t('paydayDrawer.confirmSuccess'));
          await Promise.all([
            utils.listIncomeEvents.invalidate(),
            utils.listPools.invalidate(),
            utils.listTransactions.invalidate(),
            utils.getMonthlySummary.invalidate(),
          ]);

          if (onConfirmSuccess) onConfirmSuccess();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('paydayDrawer.confirmSplitFailed'));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  return {
    handleResetPlan,
    handleRecalculateWaterfall,
    handleDeleteIncome,
    handleSaveSplit,
    handleConfirmSplit,
    executeAutoSave,
  };
}
