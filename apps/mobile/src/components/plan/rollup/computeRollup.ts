import { t } from '@money-matters/i18n';
import type { MobileBankTransferPool, MobileBankTransferAccount } from '../MobileBankTransferRollupCard';

export interface DestinationTransferGroup {
  destAccountId: string;
  destAccountName: string;
  sourceAccountName: string;
  totalAmount: number;
  payId?: string | null;
  pools: Array<{ id: string; name: string; amount: number }>;
}

interface ComputeRollupParams {
  pools: MobileBankTransferPool[];
  linesMap: Record<string, string>;
  sweepPoolId?: string;
  sweepPoolRemainder: number;
  receivingAccountId?: string | null;
  bankAccounts: MobileBankTransferAccount[];
  sourceAccountName: string;
}

export function computeBankTransferRollup({
  pools,
  linesMap,
  sweepPoolId,
  sweepPoolRemainder,
  receivingAccountId,
  bankAccounts,
  sourceAccountName,
}: ComputeRollupParams) {
  const retained: Array<{ id: string; name: string; amount: number }> = [];
  const transferMap = new Map<string, DestinationTransferGroup>();

  for (const pool of pools) {
    const amount =
      pool.id === sweepPoolId
        ? Math.max(0, sweepPoolRemainder)
        : parseFloat(linesMap[pool.id] || '0');

    if (amount <= 0.005) continue;

    const isSameAccount =
      (receivingAccountId && pool.bankAccountId === receivingAccountId) ||
      (!pool.bankAccountId && (!receivingAccountId || pool.bankAccountId === receivingAccountId));

    if (isSameAccount) {
      retained.push({ id: pool.id, name: pool.name, amount });
    } else {
      const destId = pool.bankAccountId || 'unknown-dest';
      const destAcc = bankAccounts.find((a) => a.id === destId);
      const destName = pool.bankAccountName || destAcc?.name || t('cards.paydayTransfer.destAccountDefault');

      const existing = transferMap.get(destId);
      if (existing) {
        existing.totalAmount += amount;
        existing.pools.push({ id: pool.id, name: pool.name, amount });
      } else {
        transferMap.set(destId, {
          destAccountId: destId,
          destAccountName: destName,
          sourceAccountName,
          totalAmount: amount,
          payId: destAcc?.payId,
          pools: [{ id: pool.id, name: pool.name, amount }],
        });
      }
    }
  }

  return {
    retainedItems: retained,
    retainedTotal: retained.reduce((s, r) => s + r.amount, 0),
    externalTransfers: Array.from(transferMap.values()),
  };
}
