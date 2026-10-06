import { useMemo } from 'react';
import type { ReconcilePoolItem } from '../ReconciliationPoolRow';

interface ReconciliationPoolsParams {
  linkedPools?: Array<{
    id: string;
    name: string;
    poolType: string;
    currentBalance: string | number;
    isSurplusTarget?: boolean | null;
  }>;
  availableToBudget: number;
}

export function useReconciliationCalculations({
  linkedPools,
  availableToBudget,
}: ReconciliationPoolsParams) {
  const parsedPools: ReconcilePoolItem[] = useMemo(() => {
    return (linkedPools ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      poolType: p.poolType,
      currentBalance:
        typeof p.currentBalance === 'number'
          ? p.currentBalance
          : parseFloat(String(p.currentBalance || '0')),
      isSurplusTarget: p.isSurplusTarget,
    }));
  }, [linkedPools]);

  const expectedTotal = parsedPools.reduce((sum, p) => sum + p.currentBalance, 0);
  const variance = Number((availableToBudget - expectedTotal).toFixed(2));
  const isSurplus = variance > 0;
  const absVariance = Math.abs(variance);

  const hasSurplusTargetInList = useMemo(
    () => parsedPools.some((p) => p.isSurplusTarget),
    [parsedPools]
  );

  const isPoolSweepTarget = (p: ReconcilePoolItem) =>
    Boolean(p.isSurplusTarget || (!hasSurplusTargetInList && p.poolType === 'EVERYDAY'));

  const visiblePools = useMemo(() => {
    let list: ReconcilePoolItem[];
    if (!isSurplus) {
      list = parsedPools.filter(
        (p) => isPoolSweepTarget(p) || p.poolType === 'EVERYDAY' || p.currentBalance > 0
      );
    } else {
      list = [...parsedPools];
    }

    return list.sort((a, b) => {
      const aSweep = isPoolSweepTarget(a);
      const bSweep = isPoolSweepTarget(b);
      if (aSweep && !bSweep) return -1;
      if (!aSweep && bSweep) return 1;
      return 0;
    });
  }, [parsedPools, isSurplus, hasSurplusTargetInList]);

  const hasHiddenZeroPools = !isSurplus && parsedPools.some(
    (p) => !isPoolSweepTarget(p) && p.poolType !== 'EVERYDAY' && p.currentBalance <= 0
  );

  return {
    parsedPools,
    expectedTotal,
    variance,
    isSurplus,
    absVariance,
    isPoolSweepTarget,
    visiblePools,
    hasHiddenZeroPools,
  };
}
