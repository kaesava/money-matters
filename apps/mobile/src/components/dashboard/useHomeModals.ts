import { useState, useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';
import type { AssistantResult } from '@money-matters/types';
import { QuickActionType, QuickActionInitialData } from '../QuickExpenseModal';
import { MarkPaidEvent } from '../MarkPaidModal';
import { MobileReconciliationModalProps } from '../envelopes/MobileReconciliationModal';

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
  everydayPool?: PoolItem
) {
  const router = useRouter();

  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [quickModalType, setQuickModalType] = useState<QuickActionType>('DEBIT');
  const [quickModalData, setQuickModalData] = useState<QuickActionInitialData | undefined>(undefined);
  const [affordModalVisible, setAffordModalVisible] = useState(false);
  const [affordModalAmount, setAffordModalAmount] = useState<string | undefined>(undefined);
  const [askSheetVisible, setAskSheetVisible] = useState(false);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);
  const [reconcileAccount, setReconcileAccount] = useState<MobileReconciliationModalProps['account'] | null>(null);

  const openQuickModal = useCallback((type: QuickActionType) => {
    setQuickModalType(type);
    setQuickModalVisible(true);
  }, []);

  const handleOpenEverydayReconciliation = useCallback(() => {
    const matchedAccount =
      bankAccounts.find((b) => b.id === everydayPool?.bankAccountId) || bankAccounts[0];

    if (!matchedAccount) return;

    const linkedPools = pools
      .filter((p) => p.bankAccountId === matchedAccount.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        envelopeType: p.envelopeType ?? undefined,
        currentBalance: p.currentBalance || 0,
        isSurplusTarget: Boolean(p.isSurplusTarget),
      }));

    const expected = linkedPools.reduce(
      (sum, p) => sum + (parseFloat(String(p.currentBalance)) || 0),
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

  const handleAssistantPrefill = useCallback(
    (prefill: Extract<AssistantResult, { type: 'prefill' }>) => {
      if (prefill.target === 'add-transaction' || prefill.target === 'mark-paid') {
        const amountStr = prefill.params?.amount ? String(prefill.params.amount) : undefined;
        const billOrMerchant = String(prefill.params?.billName || prefill.params?.merchant || prefill.params?.entityName || '');
        setQuickModalData({
          type: 'DEBIT',
          name: billOrMerchant,
          amount: amountStr,
          date: prefill.params?.date ? String(prefill.params.date) : undefined,
          envelopeName: billOrMerchant,
        });
        setQuickModalType('DEBIT');
        setQuickModalVisible(true);
      } else if (prefill.target === 'transfer') {
        const amountStr = prefill.params?.amount ? String(prefill.params.amount) : undefined;
        setQuickModalData({
          type: 'TRANSFER',
          amount: amountStr,
          sourcePoolName: prefill.params?.sourceAccount ? String(prefill.params.sourceAccount) : undefined,
          destinationPoolName: prefill.params?.destinationAccount ? String(prefill.params.destinationAccount) : undefined,
        });
        setQuickModalType('TRANSFER');
        setQuickModalVisible(true);
      } else if (prefill.target === 'afford-check') {
        const amountStr = prefill.params?.amount ? String(prefill.params.amount) : undefined;
        setAffordModalAmount(amountStr);
        setAffordModalVisible(true);
      } else if (prefill.target === 'create-bill' || prefill.target === 'create-income') {
        router.push('/(app)/paychecks' as Href);
      } else if (prefill.target === 'history-filter') {
        router.push('/(app)/transactions' as Href);
      } else if (prefill.target === 'navigate') {
        const screen = String(prefill.params?.targetScreen || prefill.params?.screen || '');
        if (screen === 'income-and-bills') router.push('/(app)/paychecks' as Href);
        else if (screen === 'envelopes') router.push('/(app)/envelopes' as Href);
        else if (screen === 'bank-accounts') router.push('/(app)/settings' as Href);
        else if (screen === 'settings') router.push('/(app)/settings' as Href);
        else if (screen === 'history') router.push('/(app)/transactions' as Href);
      }
    },
    [router]
  );

  return {
    quickModalVisible,
    setQuickModalVisible,
    quickModalType,
    quickModalData,
    affordModalVisible,
    setAffordModalVisible,
    affordModalAmount,
    askSheetVisible,
    setAskSheetVisible,
    markPaidEvent,
    setMarkPaidEvent,
    reconcileAccount,
    setReconcileAccount,
    openQuickModal,
    handleOpenEverydayReconciliation,
    handleAssistantPrefill,
  };
}
