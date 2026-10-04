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
