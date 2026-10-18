import { AllocationLineItem } from './MobileIncomeSplitPoolList';

export function extractLines(engineResult: unknown): AllocationLineItem[] {
  const res = engineResult as {
    lines?: Array<{
      bucketId?: string;
      poolId?: string;
      bucketName?: string;
      poolName?: string;
      proposedAmount?: number | string;
      reasoning?: string;
    }>;
  };
  return (res?.lines || []).map((item) => ({
    bucketId: String(item.bucketId || item.poolId || ''),
    bucketName: String(item.bucketName || item.poolName || 'Pool'),
    proposedAmount:
      typeof item.proposedAmount === 'number'
        ? item.proposedAmount
        : parseFloat(String(item.proposedAmount || '0')),
    reasoning: String(item.reasoning || ''),
  }));
}

export interface PaycheckStudioPreviewData {
  incomeEventName?: string;
  actualAmount?: number | null;
  expectedAmount?: number;
  expectedDate?: string;
  hasSavedPlan: boolean;
  planStatus: string;
  lines: Array<{
    envelopeId: string;
    envelopeName: string;
    proposedAmount: number;
    savedAmount?: number | null;
    reasoning?: string | null;
  }>;
}

export interface UsePaycheckStudioMutationsParams {
  id: string | undefined;
  sourceName: string;
  actualAmount: string;
  selectedDate: string;
  linesMap: Record<string, string>;
  reasoningMap: Record<string, string>;
  initialLinesMap: Record<string, string>;
  initialReasoningMap: Record<string, string>;
  isSavedPlan: boolean;
  isReadOnly: boolean;
  previewQuery: {
    data?: PaycheckStudioPreviewData;
  };
  sweepPool: { id: string; name: string } | undefined;
  sweepPoolRemainder: number;
  numericActual: number;
  lines: AllocationLineItem[];
  setIsSavedPlan: (v: boolean) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  isDeficit: boolean;
  onConfirmSuccess?: () => void;
  onApplyFreshData?: (data: PaycheckStudioPreviewData) => void;
  onSaveSuccess?: () => void;
}

export function buildAllocationsPayload(
  linesMap: Record<string, string>,
  reasoningMap: Record<string, string>,
  sweepPool: { id: string; name: string } | undefined,
  sweepPoolRemainder: number,
  lines: AllocationLineItem[]
) {
  const effectiveMap = { ...linesMap };
  if (sweepPool) effectiveMap[sweepPool.id] = sweepPoolRemainder.toFixed(2);
  return Object.entries(effectiveMap).map(([pId, val]) => {
    const amt = parseFloat(val) || 0;
    return {
      poolId: pId,
      proposedAmount: amt.toFixed(2),
      reasoning: amt <= 0 ? undefined : (reasoningMap[pId] ?? (lines.find((l) => l.bucketId === pId)?.reasoning || undefined)),
    };
  });
}

export function buildConfirmPayload(
  linesMap: Record<string, string>,
  reasoningMap: Record<string, string>,
  sweepPool: { id: string; name: string } | undefined,
  sweepPoolRemainder: number,
  lines: AllocationLineItem[]
) {
  const effectiveMap = { ...linesMap };
  if (sweepPool) effectiveMap[sweepPool.id] = sweepPoolRemainder.toFixed(2);
  return Object.entries(effectiveMap).map(([pId, val]) => {
    const amt = parseFloat(val) || 0;
    return {
      envelopeId: pId,
      amount: amt.toFixed(2),
      reasoning: amt <= 0 ? undefined : (reasoningMap[pId] ?? (lines.find((l) => l.bucketId === pId)?.reasoning || undefined)),
    };
  });
}

export function calculateAllocatedTotals(
  lines: AllocationLineItem[],
  pools: Array<{ id: string; envelopeType?: string }>,
  linesMap: Record<string, string>
) {
  let everydayAllocated = 0;
  let billsAllocated = 0;
  let goalsAllocated = 0;

  for (const l of lines) {
    const et = pools.find((p) => p.id === l.bucketId)?.envelopeType;
    const val = parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0;
    if (et === 'EVERYDAY') {
      everydayAllocated += val;
    } else if (et === 'TARGET_GOAL' || et === 'ONGOING_GOAL') {
      goalsAllocated += val;
    } else {
      billsAllocated += val;
    }
  }

  return { everydayAllocated, billsAllocated, goalsAllocated };
}
