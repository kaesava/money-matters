"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import type { AllocationLineItem, PaydayPreviewData } from "./useIncomeSplitState";

export interface UseIncomeSplitActionsParams {
  incomeEventId: string;
  sourceName: string;
  actualAmount: string;
  selectedDate: string;
  numericActual: number;
  lines: AllocationLineItem[];
  linesMap: Record<string, string>;
  setLinesMap: (map: Record<string, string>) => void;
  initialLinesMap: Record<string, string>;
  setInitialLinesMap: (map: Record<string, string>) => void;
  reasoningMap: Record<string, string>;
  setReasoningMap: (map: Record<string, string>) => void;
  initialReasoningMap: Record<string, string>;
  setInitialReasoningMap: (map: Record<string, string>) => void;
  sweepPool?: { id: string } | null;
  sweepPoolRemainder: number;
  isDeficit: boolean;
  isReadOnly: boolean;
  isFutureDate: boolean;
  isSavedPlan: boolean;
  setIsSavedPlan: (saved: boolean) => void;
  submitting: boolean;
  setSubmitting: (submitting: boolean) => void;
  setShowConfirmWarning: (show: boolean) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  setShowRecalculateConfirm: (show: boolean) => void;
  setShowExitDialog: (show: boolean) => void;
  setShowTransferModal: (show: boolean) => void;
  returnTo: string;
  previewData?: PaydayPreviewData | null;
  applyPreviewData: (data: PaydayPreviewData) => void;
  setSourceName: (val: string) => void;
  setActualAmount: (val: string) => void;
  setSelectedDate: (val: string) => void;
}

export function useIncomeSplitActions({
  incomeEventId,
  sourceName,
  actualAmount,
  selectedDate,
  numericActual,
  lines,
  linesMap,
  setLinesMap,
  initialLinesMap,
  setInitialLinesMap,
  reasoningMap,
  setReasoningMap,
  initialReasoningMap,
  setInitialReasoningMap,
  sweepPool,
  sweepPoolRemainder,
  isDeficit,
  isReadOnly: _isReadOnly,
  isFutureDate,
  isSavedPlan,
  setIsSavedPlan,
  submitting,
  setSubmitting,
  setShowConfirmWarning,
  setShowDeleteConfirm,
  setShowRecalculateConfirm,
  setShowExitDialog,
  setShowTransferModal,
  returnTo,
  previewData,
  applyPreviewData,
  setSourceName,
  setActualAmount,
  setSelectedDate,
}: UseIncomeSplitActionsParams) {
  const router = useRouter();
  const toast = useToast();
  const utils = trpc.useUtils();

  const confirmPaydayMut = trpc.confirmPayday.useMutation();
  const overrideEventMut = trpc.overrideEvent.useMutation();
  const saveBulkAllocationsMut = trpc.saveBulkAllocations.useMutation();
  const resetAllocationPlanMut = trpc.resetAllocationPlan.useMutation();
  const deleteIncomeMut = trpc.deleteIncomeEvent.useMutation();

  const handleDiscardAndExit = () => {
    setShowExitDialog(false);
    router.push(returnTo);
  };

  const handleDiscardEdits = () => {
    setLinesMap({ ...initialLinesMap });
    setReasoningMap({ ...initialReasoningMap });
    if (previewData) {
      setSourceName(previewData.incomeEventName || "Paycheck");
      setActualAmount(String(previewData.actualAmount ?? previewData.expectedAmount));
      setSelectedDate(previewData.expectedDate || "");
    }
    toast.success(t("paydayDrawer.discardEditsSuccess"));
  };

  const handleRecalculateWaterfall = async () => {
    try {
      setSubmitting(true);
      await overrideEventMut.mutateAsync({
        eventId: incomeEventId,
        eventType: "INCOME",
        name: sourceName,
        actualAmount: parseFloat(actualAmount).toFixed(2),
        actualDate: selectedDate,
        expectedAmount: parseFloat(actualAmount).toFixed(2),
        expectedDate: selectedDate,
      });
      if (isSavedPlan) {
        await resetAllocationPlanMut.mutateAsync({ incomeEventId });
        setIsSavedPlan(false);
      }
      const freshData = await utils.previewPayday.fetch({ incomeEventId }, { staleTime: 0 });
      if (freshData) {
        applyPreviewData(freshData);
      }
      await Promise.all([
        utils.listIncomeEvents.invalidate(),
        utils.listAllAllocationPlans.invalidate(),
      ]);
      toast.success(t("paydayDrawer.recalculateSuccess"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("paydayDrawer.recalculateFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecalculateSavedConfirmed = async () => {
    setShowRecalculateConfirm(false);
    await handleRecalculateWaterfall();
  };

  const handleDeleteIncome = async () => {
    try {
      setSubmitting(true);
      await deleteIncomeMut.mutateAsync({ eventId: incomeEventId });
      toast.success(t("paydayDrawer.incomeDeleted"));
      await Promise.all([
        utils.listIncomeEvents.invalidate(),
        utils.listAllAllocationPlans.invalidate(),
        utils.getMatrixProjectionData.invalidate(),
      ]);
      router.push(returnTo);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("paydayDrawer.deleteFailed"));
    } finally {
      setSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveSplit = async () => {
    if (isDeficit) return;
    setSubmitting(true);
    try {
      await overrideEventMut.mutateAsync({
        eventId: incomeEventId,
        eventType: "INCOME",
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
          reasoning:
            amt <= 0
              ? undefined
              : reasoningMap[pId] ?? (lines.find((l) => l.bucketId === pId)?.reasoning || undefined),
        };
      });

      await saveBulkAllocationsMut.mutateAsync({
        incomeEventId,
        totalIncomeAmount: numericActual.toFixed(2),
        lines: payload,
      });

      setIsSavedPlan(true);
      setInitialLinesMap({ ...effectiveMap });
      setLinesMap({ ...effectiveMap });
      setInitialReasoningMap({ ...reasoningMap });
      toast.success(t("matrix.lockSplitSuccess"));

      const freshData = await utils.previewPayday.fetch({ incomeEventId }, { staleTime: 0 });
      if (freshData) {
        applyPreviewData(freshData);
      }

      await Promise.all([
        utils.listIncomeEvents.invalidate(),
        utils.listAllAllocationPlans.invalidate(),
        utils.getMatrixProjectionData.invalidate(),
      ]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("paydayDrawer.saveSplitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const executeConfirmSplit = async () => {
    if (isDeficit || submitting || isFutureDate) return;
    setShowConfirmWarning(false);
    setSubmitting(true);
    try {
      await overrideEventMut.mutateAsync({
        eventId: incomeEventId,
        eventType: "INCOME",
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
          envelopeId: pId,
          amount: amt.toFixed(2),
          reasoning:
            amt <= 0
              ? undefined
              : reasoningMap[pId] ?? (lines.find((l) => l.bucketId === pId)?.reasoning || undefined),
        };
      });

      await confirmPaydayMut.mutateAsync({
        incomeEventId,
        actualAmount: numericActual.toFixed(2),
        markAsReceivedToday: false,
        lines: payload,
      });

      toast.success(t("paydayDrawer.confirmSuccess"));
      await utils.listIncomeEvents.invalidate();
      await utils.listPools.invalidate();
      setShowTransferModal(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("paydayDrawer.confirmSplitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    handleDiscardAndExit,
    handleDiscardEdits,
    handleRecalculateSavedConfirmed,
    handleDeleteIncome,
    handleSaveSplit,
    executeConfirmSplit,
  };
}
