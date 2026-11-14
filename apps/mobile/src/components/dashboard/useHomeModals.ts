import { useState, useCallback } from 'react';
import { QuickActionType, QuickActionInitialData } from '../QuickExpenseModal';
import { MarkPaidEvent } from '../MarkPaidModal';
import { MobileSyncBalanceModalProps } from '../envelopes/MobileSyncBalanceModal';

interface PoolItem {
  id: string;
  name: string;
  envelopeType?: string | null;
  currentBalance?: number | null;
  bankAccountId?: string | null;
  isSurplusTarget?: boolean | null;
}

interface BankAccountItem {
  id: string;
  name: string;
  lastKnownBalance?: string | null;
  unbudgetedBuffer?: string | null;
}

export function useHomeModals(
  pools: PoolItem[],
  bankAccounts: BankAccountItem[],
  everydayPool: PoolItem | undefined
) {
  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [quickModalType, setQuickModalType] = useState<QuickActionType>('DEBIT');
  const [quickModalData, setQuickModalData] = useState<QuickActionInitialData | undefined>(undefined);
  const [affordModalVisible, setAffordModalVisible] = useState(false);
  const [affordModalAmount, setAffordModalAmount] = useState<string | undefined>(undefined);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);
  const [reconcileAccount, setReconcileAccount] = useState<MobileSyncBalanceModalProps['account']>(null);

  const openQuickModal = useCallback((type: QuickActionType) => {
    setQuickModalData(undefined);
    setQuickModalType(type);
    setQuickModalVisible(true);
  }, []);

  const handleOpenEverydayReconciliation = useCallback(() => {
    const matchedAccount = everydayPool?.bankAccountId
      ? bankAccounts.find((a) => a.id === everydayPool.bankAccountId)
      : bankAccounts[0];
    if (!matchedAccount) return;

    const linkedPools = pools
      .filter((p) => p.bankAccountId === matchedAccount.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        envelopeType: p.envelopeType ?? undefined,
        currentBalance: p.currentBalance ?? 0,
        isSurplusTarget: p.isSurplusTarget,
      }));
    const expected = linkedPools.reduce(
      (sum, p) => sum + (typeof p.currentBalance === 'number' ? p.currentBalance : parseFloat(String(p.currentBalance || 0))),
      0
    );

    setReconcileAccount({
      id: matchedAccount.id,
      name: matchedAccount.name,
      lastKnownBalance: matchedAccount.lastKnownBalance || '0.00',
      unbudgetedBuffer: matchedAccount.unbudgetedBuffer || '0.00',
      expectedBalance: expected,
      linkedPools,
    });
  }, [bankAccounts, everydayPool?.bankAccountId, pools]);

  return {
    quickModalVisible,
    setQuickModalVisible,
    quickModalType,
    quickModalData,
    affordModalVisible,
    setAffordModalVisible,
    affordModalAmount,
    markPaidEvent,
    setMarkPaidEvent,
    reconcileAccount,
    setReconcileAccount,
    openQuickModal,
    handleOpenEverydayReconciliation,
  };
}
