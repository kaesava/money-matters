import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { formatIsoDate } from '../../lib/format';
import { t } from '@money-matters/i18n';
import { useMobileToast, showMobileConfirm } from '@money-matters/ui/mobile';
import { AllocationLineItem } from './MobileIncomeSplitPoolList';
import { usePaycheckStudioMutations } from './usePaycheckStudioMutations';
import { PaycheckStudioPreviewData, calculateAllocatedTotals } from './paycheck-studio-types';

export function usePaycheckStudio(id: string | undefined, returnTo?: string) {
  const toast = useMobileToast();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: !!session?.user });
  const pools = poolsQuery.data ?? [];
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: !!session?.user });
  const bankAccounts = bankAccountsQuery.data ?? [];
  const previewQuery = trpc.previewPayday.useQuery({ incomeEventId: id! }, { enabled: !!id && !!session?.user });

  const [actualAmount, setActualAmount] = useState('0.00');
  const [initialAmount, setInitialAmount] = useState('0.00');
  const [sourceName, setSourceName] = useState('Paycheck');
  const [selectedDate, setSelectedDate] = useState(() => formatIsoDate(new Date()));
  const [linesMap, setLinesMap] = useState<Record<string, string>>({});
  const [initialLinesMap, setInitialLinesMap] = useState<Record<string, string>>({});
  const [reasoningMap, setReasoningMap] = useState<Record<string, string>>({});
  const [initialReasoningMap, setInitialReasoningMap] = useState<Record<string, string>>({});
  const [isSavedPlan, setIsSavedPlan] = useState(false);
  const [isConfirmedPlan, setIsConfirmedPlan] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = useMemo(() => formatIsoDate(new Date()), []);

  const applyFreshData = useCallback((pData: PaycheckStudioPreviewData) => {
    setSourceName(pData.incomeEventName || t('paydayDrawer.incomeDepositDefault'));
    const amt = String(pData.actualAmount ?? pData.expectedAmount ?? '0.00');
    setActualAmount(amt);
    setInitialAmount(amt);
    setSelectedDate(formatIsoDate(pData.expectedDate || new Date()));

    const initMap: Record<string, string> = {};
    const initReasoningMap: Record<string, string> = {};
    pData.lines.forEach((line) => {
      const val = line.savedAmount ?? line.proposedAmount;
      initMap[line.envelopeId] = val.toFixed(2);
      if (line.reasoning && val > 0) initReasoningMap[line.envelopeId] = line.reasoning;
    });
    setLinesMap(initMap);
    setInitialLinesMap(initMap);
    setReasoningMap(initReasoningMap);
    setInitialReasoningMap(initReasoningMap);
    setIsSavedPlan(pData.hasSavedPlan);
    setIsConfirmedPlan(pData.planStatus === 'CONFIRMED');
  }, []);

  useEffect(() => {
    if (previewQuery.data) {
      applyFreshData(previewQuery.data as PaycheckStudioPreviewData);
    }
  }, [previewQuery.data, applyFreshData]);

  const lines = useMemo(() => {
    if (!previewQuery.data) return [];
    return previewQuery.data.lines.map((l) => ({
      bucketId: l.envelopeId,
      bucketName: l.envelopeName,
      proposedAmount: l.savedAmount ?? l.proposedAmount,
      reasoning: l.reasoning ?? '',
    }));
  }, [previewQuery.data]);

  const numericActual = parseFloat(actualAmount) || 0;
  const isReadOnly = isConfirmedPlan;
  const isFutureDate = selectedDate > todayStr;

  const sweepPool = useMemo(() => {
    return pools.find((p) => p.isSurplusTarget) || pools.find((p) => p.envelopeType === 'EVERYDAY') || pools[0];
  }, [pools]);

  const nonSweepAllocatedSum = useMemo(() => {
    if (!sweepPool) return 0;
    return Object.entries(linesMap).reduce((acc, [bId, valStr]) => {
      if (bId === sweepPool.id) return acc;
      return acc + (parseFloat(valStr) || 0);
    }, 0);
  }, [linesMap, sweepPool]);

  const sweepPoolRemainder = useMemo(() => {
    return Math.max(-999999, Math.round((numericActual - nonSweepAllocatedSum) * 100) / 100);
  }, [numericActual, nonSweepAllocatedSum]);

  const isDeficit = sweepPoolRemainder < 0;

  const isDirty = useMemo(() => {
    if (!previewQuery.data) return false;
    const pData = previewQuery.data;
    if (sourceName !== (pData.incomeEventName || t('paydayDrawer.incomeDepositDefault'))) return true;
    if (actualAmount !== String(pData.actualAmount ?? pData.expectedAmount)) return true;
    if (selectedDate !== formatIsoDate(pData.expectedDate)) return true;
    for (const [pId, val] of Object.entries(linesMap)) {
      if (initialLinesMap[pId] !== val) return true;
    }
    for (const [pId, val] of Object.entries(reasoningMap)) {
      if (initialReasoningMap[pId] !== val) return true;
    }
    return false;
  }, [previewQuery.data, sourceName, actualAmount, selectedDate, linesMap, initialLinesMap, reasoningMap, initialReasoningMap]);

  const handleLineAmountChange = (bucketId: string, val: string) => {
    let cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) cleaned = `${parts[0]}.${parts.slice(1).join('')}`;
    if (parts[0].length > 12) {
      parts[0] = parts[0].slice(0, 12);
      cleaned = parts[1] !== undefined ? `${parts[0]}.${parts[1]}` : parts[0];
    }
    if (parts[1] && parts[1].length > 2) cleaned = `${parts[0]}.${parts[1].slice(0, 2)}`;
    setLinesMap((prev) => ({ ...prev, [bucketId]: cleaned }));
    if ((parseFloat(cleaned) || 0) <= 0) setReasoningMap((prev) => ({ ...prev, [bucketId]: '' }));
  };

  const handleLineReasoningChange = (bucketId: string, reasoning: string) => {
    const currentVal = bucketId === sweepPool?.id ? sweepPoolRemainder : parseFloat(linesMap[bucketId] ?? '0') || 0;
    if (currentVal <= 0) return;
    setReasoningMap((prev) => ({ ...prev, [bucketId]: reasoning }));
  };

  const handleResetAllEdits = () => {
    setLinesMap({ ...initialLinesMap });
    setReasoningMap({ ...initialReasoningMap });
    setActualAmount(initialAmount);
    toast.success(t('paydayDrawer.discardEditsSuccess'));
  };

  const mutations = usePaycheckStudioMutations({
    id, sourceName, actualAmount, selectedDate, linesMap, reasoningMap,
    initialLinesMap, initialReasoningMap, isSavedPlan, isReadOnly, previewQuery, sweepPool,
    sweepPoolRemainder, numericActual, isDeficit, lines,
    submitting, setSubmitting, setIsSavedPlan,
    onConfirmSuccess: () => setShowTransferModal(true),
    onApplyFreshData: applyFreshData,
    onSaveSuccess: () => {
      const effectiveMap = { ...linesMap };
      if (sweepPool) effectiveMap[sweepPool.id] = sweepPoolRemainder.toFixed(2);
      setInitialLinesMap({ ...effectiveMap });
      setInitialReasoningMap({ ...reasoningMap });
    },
  });

  const attemptExit = useCallback(() => {
    if (isDirty && !isReadOnly) {
      setShowExitDialog(true);
      return;
    }
    if (returnTo) router.push(returnTo as Href);
    else router.back();
  }, [isDirty, isReadOnly, returnTo, router]);

  const handleSaveAndExit = async () => {
    if (isDeficit) return;
    try {
      setSubmitting(true);
      await mutations.executeAutoSave();
      if (returnTo) router.push(returnTo as Href);
      else router.back();
    } finally {
      setSubmitting(false);
      setShowExitDialog(false);
    }
  };

  const handleDiscardAndExit = () => {
    setShowExitDialog(false);
    if (returnTo) router.push(returnTo as Href);
    else router.back();
  };

  const handleRecalculateTrigger = () => {
    showMobileConfirm({
      title: isSavedPlan ? t('paydayDrawer.recalculateConfirmTitle') : t('paydayDrawer.recalculateUnlockedConfirmTitle'),
      message: isSavedPlan ? t('paydayDrawer.recalculateConfirmDescription') : t('paydayDrawer.recalculateUnlockedConfirmDescription'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        if (isSavedPlan) {
          await mutations.handleResetPlan();
        } else {
          await mutations.handleRecalculateWaterfall();
        }
      },
    });
  };

  const { everydayAllocated, billsAllocated, goalsAllocated } = useMemo(
    () => calculateAllocatedTotals(lines, pools, linesMap),
    [lines, pools, linesMap]
  );

  const groupedLines = useMemo(() => {
    const groups: Array<{ type: 'EVERYDAY' | 'REGULAR' | 'GOAL'; label: string; items: AllocationLineItem[] }> = [
      { type: 'EVERYDAY', label: t('paydayDrawer.everydayPools'), items: [] },
      { type: 'REGULAR', label: t('paydayDrawer.billsPools'), items: [] },
      { type: 'GOAL', label: t('paydayDrawer.goalsPools'), items: [] },
    ];
    for (const l of lines) {
      const env = pools.find((pool) => pool.id === l.bucketId);
      const et = env?.envelopeType || 'SCHEDULED_BILL';
      if (et === 'EVERYDAY') groups[0].items.push(l);
      else if (et === 'TARGET_GOAL' || et === 'ONGOING_GOAL') groups[2].items.push(l);
      else groups[1].items.push(l);
    }
    return groups.filter((g) => g.items.length > 0);
  }, [lines, pools]);

  return {
    session,
    isLoading: previewQuery.isLoading || poolsQuery.isLoading || bankAccountsQuery.isLoading,
    previewData: previewQuery.data,
    pools, bankAccounts, sourceName, setSourceName,
    actualAmount, setActualAmount, initialAmount,
    selectedDate, setSelectedDate, linesMap, reasoningMap,
    isSavedPlan, isConfirmedPlan, isReadOnly, isFutureDate,
    isDirty, isDeficit, numericActual, sweepPool, sweepPoolRemainder,
    everydayAllocated, billsAllocated, goalsAllocated, groupedLines,
    submitting, attemptExit, handleRecalculateTrigger,
    handleRecalculateWaterfall: mutations.handleRecalculateWaterfall,
    handleResetPlan: mutations.handleResetPlan,
    handleResetAllEdits,
    handleDeleteIncome: mutations.handleDeleteIncome,
    handleSaveSplit: mutations.handleSaveSplit,
    handleConfirmSplit: mutations.handleConfirmSplit,
    handleLineAmountChange, handleLineReasoningChange,
    showTransferModal, setShowTransferModal,
    showExitDialog, setShowExitDialog,
    handleSaveAndExit, handleDiscardAndExit,
  };
}
