import { useState, useEffect, useMemo, useCallback } from 'react';
import { validateShortfallAllocations } from '@money-matters/types';
import { trpc } from '../../lib/trpc';
import { useMobileToast } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { triggerHaptic } from '../../lib/haptics';
import { formatIsoDate } from '../../lib/format';
import { MarkPaidEvent, FundingPoolItem } from './mark-paid-types';

export function useMarkPaidForm(
  visible: boolean,
  event: MarkPaidEvent | null,
  onClose: () => void,
  onSuccess?: () => void
) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const todayStr = useMemo(() => formatIsoDate(new Date()), []);

  const [actualAmount, setActualAmount] = useState('');
  const [actualDate, setActualDate] = useState(todayStr);
  const [wasFutureDate, setWasFutureDate] = useState(false);
  const [originalDate, setOriginalDate] = useState('');
  const [note, setNote] = useState('');
  const [transferAmounts, setTransferAmounts] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const { data: pools = [] } = trpc.listPools.useQuery(undefined, { enabled: visible });
  const overrideMut = trpc.overrideEvent.useMutation();
  const moveMoneyMut = trpc.moveMoney.useMutation();

  useEffect(() => {
    if (event && visible) {
      setActualAmount(event.expectedAmount.toFixed(2));
      const isFuture = Boolean(event.expectedDate && event.expectedDate > todayStr);
      setWasFutureDate(isFuture);
      setOriginalDate(event.expectedDate || '');
      setActualDate(isFuture ? todayStr : event.expectedDate || todayStr);
      setNote(event.name || '');
      setGeneralError('');
    }
  }, [event, visible, todayStr]);

  const targetPoolId = event?.poolId || event?.categoryId;
  const currentPool = useMemo(() => pools.find((p) => p.id === targetPoolId), [pools, targetPoolId]);
  const poolBal = useMemo(() => {
    if (!currentPool) return 0;
    return typeof currentPool.currentBalance === 'number' ? currentPool.currentBalance : parseFloat(String(currentPool.currentBalance) || '0');
  }, [currentPool]);

  const numAmount = useMemo(() => {
    const p = parseFloat(actualAmount);
    return isNaN(p) || p < 0 ? 0 : p;
  }, [actualAmount]);

  const shortfallAmount = useMemo(() => Math.max(0, numAmount - poolBal), [numAmount, poolBal]);
  const hasShortfall = shortfallAmount > 0.001;

  const validFundingPools = useMemo(() => {
    return pools.filter((p) => {
      if (p.id === targetPoolId) return false;
      const b = typeof p.currentBalance === 'number' ? p.currentBalance : parseFloat(String(p.currentBalance) || '0');
      return b > 0;
    });
  }, [pools, targetPoolId]);

  const surplusPool = useMemo(() => validFundingPools.find((p) => p.isSurplusTarget) || validFundingPools[0], [validFundingPools]);

  const groupedPools = useMemo(() => {
    const map: Record<string, FundingPoolItem[]> = {};
    for (const p of validFundingPools) {
      const k = p.poolType || 'OTHER';
      if (!map[k]) map[k] = [];
      map[k].push(p);
    }
    return map;
  }, [validFundingPools]);

  const groupKeys = useMemo(() => Object.keys(groupedPools).sort().join(','), [groupedPools]);

  useEffect(() => {
    if (!visible || !hasShortfall) {
      setTransferAmounts((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setExpandedGroups((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    const initAmounts: Record<string, string> = {};
    if (surplusPool) {
      const b = typeof surplusPool.currentBalance === 'number' ? surplusPool.currentBalance : parseFloat(String(surplusPool.currentBalance) || '0');
      const prefill = Math.min(shortfallAmount, b);
      if (prefill > 0) initAmounts[surplusPool.id] = prefill.toFixed(2);
    }
    setTransferAmounts((prev) => Object.keys(prev).length === Object.keys(initAmounts).length ? prev : initAmounts);
    const initExp: Record<string, boolean> = {};
    Object.keys(groupedPools).forEach((k) => { initExp[k] = true; });
    setExpandedGroups((prev) => Object.keys(prev).length === Object.keys(initExp).length ? prev : initExp);
  }, [visible, hasShortfall, shortfallAmount, surplusPool?.id, surplusPool?.currentBalance, groupKeys]);

  const toggleGroup = useCallback((typeKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [typeKey]: !prev[typeKey] }));
  }, []);

  const handleAmountChange = useCallback((pId: string, maxBal: number, rawVal: string) => {
    if (rawVal === '') {
      setTransferAmounts((prev) => ({ ...prev, [pId]: '' }));
      return;
    }
    if (rawVal.startsWith('-')) return;
    const parsed = parseFloat(rawVal);
    if (isNaN(parsed) || parsed < 0) {
      setTransferAmounts((prev) => ({ ...prev, [pId]: '0.00' }));
      return;
    }
    setTransferAmounts((prev) => ({ ...prev, [pId]: Math.min(parsed, maxBal).toFixed(2) }));
  }, []);

  const totalAllocated = useMemo(() => {
    return Object.values(transferAmounts).reduce((sum, v) => sum + (parseFloat(v || '0') || 0), 0);
  }, [transferAmounts]);

  const shortfallValidation = useMemo(() => validateShortfallAllocations(shortfallAmount, transferAmounts), [shortfallAmount, transferAmounts]);
  const isFulfilled = shortfallValidation.isValid;
  const isDateValid = Boolean(actualDate && actualDate <= todayStr);
  const isAmountValid = numAmount > 0;
  const isValid = isAmountValid && isDateValid && isFulfilled;

  const handleConfirm = async () => {
    if (!isValid || submitting || !event) return;
    setGeneralError('');
    setSubmitting(true);
    try {
      if (hasShortfall && currentPool) {
        const transfers = Object.entries(transferAmounts)
          .map(([pId, amt]) => ({ sourcePoolId: pId, destinationPoolId: currentPool.id, amount: parseFloat(amt || '0').toFixed(2), note: 'Shortfall Top Up' }))
          .filter((t) => parseFloat(t.amount) > 0);
        if (transfers.length > 0) await Promise.all(transfers.map((t) => moveMoneyMut.mutateAsync(t)));
      }
      await overrideMut.mutateAsync({
        eventId: event.id,
        eventType: 'EXPENSE',
        status: 'CONFIRMED',
        actualAmount: numAmount.toFixed(2),
        actualDate,
        note: note.trim() || event.name,
      });
      utils.listPools.invalidate();
      utils.listExpenseEvents.invalidate();
      utils.listTransactions.invalidate();
      utils.getMonthlySummary.invalidate();
      triggerHaptic('success');
      toast.success(t('toasts.expenseMarkedPaid'));
      onSuccess?.();
      onClose();
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Failed to mark spent');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    actualAmount, setActualAmount, actualDate, setActualDate, wasFutureDate, originalDate,
    currentPool, poolBal, shortfallAmount, hasShortfall, groupedPools, expandedGroups,
    transferAmounts, totalAllocated, shortfallValidation, toggleGroup, handleAmountChange,
    handleConfirm, submitting, generalError, isValid, isAmountValid, isDateValid,
  };
}
