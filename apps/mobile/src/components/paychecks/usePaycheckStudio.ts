import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { formatIsoDate } from '../../lib/format';
import { t } from '@money-matters/i18n';
import { useMobileToast, showMobileConfirm } from '@money-matters/ui/mobile';
import { AllocationLineItem } from './MobileIncomeSplitPoolList';
import { usePaycheckStudioMutations } from './usePaycheckStudioMutations';
import { extractLines } from './paycheck-studio-types';

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
  const [submitting, setSubmitting] = useState(false);

  const todayStr = useMemo(() => formatIsoDate(new Date()), []);

  useEffect(() => {
    if (previewQuery.data) {
      const evt = previewQuery.data.incomeEvent;
      if (evt) {
        setSourceName(evt.name || t('paydayDrawer.incomeDepositDefault'));
        const amt = evt.actualAmount || evt.expectedAmount || '0.00';
        setActualAmount(amt);
        setInitialAmount(amt);
        setSelectedDate(formatIsoDate(evt.expectedDate || new Date()));
      }

      const rawLines = extractLines(previewQuery.data.engineResult);
      const initMap: Record<string, string> = {};
      const initReasoningMap: Record<string, string> = {};
      rawLines.forEach((line) => {
        initMap[line.bucketId] = line.proposedAmount.toFixed(2);
        if (line.reasoning && line.proposedAmount > 0) initReasoningMap[line.bucketId] = line.reasoning;
      });
      setLinesMap(initMap);
      setInitialLinesMap(initMap);
      setReasoningMap(initReasoningMap);
      setInitialReasoningMap(initReasoningMap);

      const engineResult = previewQuery.data.engineResult as unknown as {
        isCustomPlan?: boolean;
        isConfirmedPlan?: boolean;
      };
      setIsSavedPlan(engineResult?.isCustomPlan ?? false);
      setIsConfirmedPlan(engineResult?.isConfirmedPlan ?? false);
    }
  }, [previewQuery.data]);

  const lines = useMemo(() => extractLines(previewQuery.data?.engineResult), [previewQuery.data]);
  const numericActual = parseFloat(actualAmount) || 0;
  const isReadOnly = isConfirmedPlan;
  const isFutureDate = selectedDate > todayStr;

  const sweepPool = useMemo(() => {
    return pools.find((p) => p.isSurplusTarget) || pools.find((p) => p.poolType === 'EVERYDAY') || pools[0];
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
    const evt = previewQuery.data.incomeEvent;
    if (sourceName !== (evt.name || t('paydayDrawer.incomeDepositDefault'))) return true;
    if (actualAmount !== (evt.actualAmount || evt.expectedAmount)) return true;
    if (selectedDate !== formatIsoDate(evt.expectedDate)) return true;
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
  };

  const attemptExit = useCallback(() => {
    const doExit = () => {
      if (returnTo) router.push(returnTo as never);
      else router.back();
    };
    if (isDirty && !isReadOnly) {
      showMobileConfirm({
        title: t('common.discardChangesTitle'),
        message: t('paydayDrawer.discardDescription'),
        confirmText: t('common.discard'),
        cancelText: t('common.cancel'),
        isDestructive: true,
        onConfirm: doExit,
      });
    } else {
      doExit();
    }
  }, [isDirty, isReadOnly, returnTo, router]);

  const mutations = usePaycheckStudioMutations({
    id, sourceName, actualAmount, selectedDate, linesMap, reasoningMap,
    sweepPool, sweepPoolRemainder, numericActual, lines, setIsSavedPlan,
    submitting, setSubmitting, isDeficit,
  });

  const handleRecalculateTrigger = () => {
    showMobileConfirm({
      title: isSavedPlan ? t('paydayDrawer.recalculateConfirmTitle') : t('paydayDrawer.recalculateConfirmTitle'),
      message: isSavedPlan ? t('paydayDrawer.recalculateConfirmDescription') : t('paydayDrawer.recalculateConfirmDescription'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        if (isSavedPlan) {
          await mutations.handleResetPlan();
        } else if (actualAmount !== initialAmount) {
          await mutations.handleRecalculateWaterfall();
        } else {
          setLinesMap({ ...initialLinesMap });
          toast.success(t('paydayDrawer.recalculateSuccess'));
        }
      },
    });
  };

  const everydayAllocated = lines
    .filter((l) => pools.find((p) => p.id === l.bucketId)?.poolType === 'EVERYDAY')
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const billsAllocated = lines
    .filter((l) => pools.find((p) => p.id === l.bucketId)?.poolType === 'REGULAR')
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const goalsAllocated = lines
    .filter((l) => pools.find((p) => p.id === l.bucketId)?.poolType === 'GOAL')
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const groupedLines = useMemo(() => {
    const groups: Array<{ type: 'EVERYDAY' | 'REGULAR' | 'GOAL'; label: string; items: AllocationLineItem[] }> = [
      { type: 'EVERYDAY', label: t('paydayDrawer.everydayPools'), items: [] },
      { type: 'REGULAR', label: t('paydayDrawer.billsPools'), items: [] },
      { type: 'GOAL', label: t('paydayDrawer.goalsPools'), items: [] },
    ];
    for (const l of lines) {
      const pType = pools.find((pool) => pool.id === l.bucketId)?.poolType || 'REGULAR';
      if (pType === 'EVERYDAY') groups[0].items.push(l);
      else if (pType === 'GOAL') groups[2].items.push(l);
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
  };
}
