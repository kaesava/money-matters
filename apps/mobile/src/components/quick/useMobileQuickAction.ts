import { useState, useMemo, useEffect } from 'react';
import { trpc } from '../../lib/trpc';
import { formatIsoDate } from '../../lib/format';
import { usePostHog } from 'posthog-react-native';
import {
  QuickPresetItem,
  QuickActionInitialData,
  computeRecentAndFrequentPresets,
  isPaydayOrAdjustment,
} from '@money-matters/types';

export type QuickActionType = 'DEBIT' | 'CREDIT' | 'TRANSFER';
export type { QuickPresetItem, QuickActionInitialData };

export function useMobileQuickAction(
  visible: boolean,
  initialType: QuickActionType = 'DEBIT',
  initialSourcePoolId?: string,
  initialData?: QuickActionInitialData
) {
  const posthog = usePostHog();
  const utils = trpc.useUtils();

  const todayStr = formatIsoDate(new Date());

  const [type, setType] = useState<QuickActionType>(initialType);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr);
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null);
  const [destPoolId, setDestPoolId] = useState('');
  const [receivingAccountId, setReceivingAccountId] = useState('');
  const [note, setNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const [confirmOverdraft, setConfirmOverdraft] = useState<{
    visible: boolean;
    poolName: string;
    amount: number;
    balance: number;
    onConfirm: () => void;
  } | null>(null);

  const [crossBankData, setCrossBankData] = useState<{
    visible: boolean;
    sourceAccountName: string;
    destAccountName: string;
    amount: number;
  } | null>(null);

  const [shortfallEvent, setShortfallEvent] = useState<{
    id: string;
    name: string;
    expectedAmount: number;
    expectedDate: string;
    poolId: string;
    categoryId: string;
  } | null>(null);

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: visible });
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery(undefined, { enabled: visible });
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 100 }, { enabled: visible });

  const pools = poolsQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];
  const txList = transactionsQuery.data ?? [];

  const everydayPool = useMemo(() => pools.find((p) => p.envelopeType === 'EVERYDAY'), [pools]);

  useEffect(() => {
    if (visible) {
      setType(initialData?.type || initialType);
      setName(initialData?.name || '');
      setAmount(
        initialData?.amount
          ? isNaN(parseFloat(initialData.amount))
            ? ''
            : parseFloat(initialData.amount).toFixed(2)
          : ''
      );
      setDate(initialData?.date || todayStr);
      setGeneralError('');
      if (initialData?.categoryId) {
        setSelectedPoolId(initialData.categoryId);
      } else if (initialData?.envelopeName && pools.length > 0) {
        const search = initialData.envelopeName.toLowerCase().trim();
        const matched = pools.find(
          (p) => p.name.toLowerCase().includes(search) || search.includes(p.name.toLowerCase())
        );
        setSelectedPoolId(matched ? matched.id : '');
      } else if (initialSourcePoolId) {
        setSelectedPoolId(initialSourcePoolId);
      } else {
        setSelectedPoolId('');
      }

      if (initialData?.sourcePoolName && pools.length > 0) {
        const search = initialData.sourcePoolName.toLowerCase().trim();
        const matched = pools.find(
          (p) => p.name.toLowerCase().includes(search) || search.includes(p.name.toLowerCase())
        );
        if (matched) setSelectedPoolId(matched.id);
      }

      if (initialData?.destinationPoolName && pools.length > 0) {
        const search = initialData.destinationPoolName.toLowerCase().trim();
        const matched = pools.find(
          (p) => p.name.toLowerCase().includes(search) || search.includes(p.name.toLowerCase())
        );
        if (matched) setDestPoolId(matched.id);
      }

      setSelectedSubCategoryId(null);
    }
  }, [visible, initialType, initialSourcePoolId, initialData, pools, todayStr]);

  const recordExpenseMutation = trpc.recordExpense.useMutation();
  const createOneOffExpenseMut = trpc.createOneOffExpense.useMutation();
  const createUpcomingIncomeMutation = trpc.createUpcomingIncome.useMutation();
  const createIncomeSourceMut = trpc.createIncomeSource.useMutation();
  const moveMoneyMutation = trpc.moveMoney.useMutation();
  const createTransferSourceMut = trpc.createTransferSource.useMutation();

  const expensePresets = useMemo(() => {
    const valid = txList.filter(
      (tx) => tx.flowType === 'DEBIT' && !tx.transferGroupId && tx.note && !isPaydayOrAdjustment(tx.note)
    );
    return computeRecentAndFrequentPresets(
      valid,
      (tx) => tx.note?.trim().toLowerCase() || null,
      (tx) => ({
        name: tx.note!.trim(),
        amount: tx.amount ? parseFloat(tx.amount).toFixed(2) : undefined,
        categoryId: tx.envelopeId || undefined,
      }),
      (tx) => (tx.recordedAt ? new Date(tx.recordedAt).getTime() : Date.now())
    );
  }, [txList]);

  const incomePresets = useMemo(() => {
    const valid = txList.filter(
      (tx) => tx.flowType === 'CREDIT' && !tx.transferGroupId && tx.note && !isPaydayOrAdjustment(tx.note)
    );
    return computeRecentAndFrequentPresets(
      valid,
      (tx) => tx.note?.trim().toLowerCase() || null,
      (tx) => ({
        name: tx.note!.trim(),
        amount: tx.amount ? parseFloat(tx.amount).toFixed(2) : undefined,
        receivingAccountId: tx.bankAccountId || undefined,
      }),
      (tx) => (tx.recordedAt ? new Date(tx.recordedAt).getTime() : Date.now())
    );
  }, [txList]);

  const transferPresets = useMemo(() => {
    const transferMap = new Map<
      string,
      { note: string; amount: string; sourceCatId?: string; destCatId?: string; timestamp: number }
    >();
    const poolNameMap = new Map(pools.map((p) => [p.id, p.name]));

    for (const tx of txList) {
      const groupKey = tx.transferGroupId || (tx.note?.startsWith('Transferred') ? tx.note : null);
      if (groupKey && !isPaydayOrAdjustment(tx.note)) {
        const existing = transferMap.get(groupKey) || {
          note: tx.note || 'Transfer',
          amount: tx.amount ? parseFloat(tx.amount).toFixed(2) : '0.00',
          timestamp: tx.recordedAt ? new Date(tx.recordedAt).getTime() : Date.now(),
        };
        if (tx.flowType === 'DEBIT') {
          existing.sourceCatId = tx.envelopeId || undefined;
        } else if (tx.flowType === 'CREDIT') {
          existing.destCatId = tx.envelopeId || undefined;
        }
        transferMap.set(groupKey, existing);
      }
    }

    const transferItems = Array.from(transferMap.values())
      .map((tItem) => {
        const srcName = tItem.sourceCatId ? poolNameMap.get(tItem.sourceCatId) : null;
        const dstName = tItem.destCatId ? poolNameMap.get(tItem.destCatId) : null;
        let displayName = tItem.note.trim();
        if (srcName && dstName && (displayName === 'Transfer' || displayName.startsWith('Transferred'))) {
          displayName = `${srcName} ➔ ${dstName}`;
        }
        return { ...tItem, displayName };
      })
      .filter((tItem) => !isPaydayOrAdjustment(tItem.displayName));

    return computeRecentAndFrequentPresets(
      transferItems,
      (tItem) => tItem.displayName.toLowerCase(),
      (tItem) => ({
        name: tItem.displayName,
        amount: tItem.amount,
        sourceCategoryId: tItem.sourceCatId,
        destinationCategoryId: tItem.destCatId,
      }),
      (tItem) => tItem.timestamp
    );
  }, [txList, pools]);

  const handleSelectPreset = (preset: QuickPresetItem) => {
    if (preset.name) setName(preset.name);
    if (preset.amount) setAmount(preset.amount);
    if (preset.categoryId) {
      setSelectedPoolId(preset.categoryId);
      setSelectedSubCategoryId(null);
    }
    if (preset.sourceCategoryId) setSelectedPoolId(preset.sourceCategoryId);
    if (preset.destinationCategoryId) setDestPoolId(preset.destinationCategoryId);
    if (preset.receivingAccountId) setReceivingAccountId(preset.receivingAccountId);
  };

  const handleTabChange = (newType: QuickActionType) => {
    setType(newType);
    setName('');
    setAmount('');
    setDate(todayStr);
    setSelectedPoolId('');
    setSelectedSubCategoryId(null);
    setNote('');
    setDestPoolId('');
    setReceivingAccountId('');
    setGeneralError('');
  };

  return {
    type,
    setType: handleTabChange,
    name,
    setName,
    amount,
    setAmount,
    date,
    setDate,
    selectedPoolId,
    setSelectedPoolId,
    selectedSubCategoryId,
    setSelectedSubCategoryId,
    destPoolId,
    setDestPoolId,
    receivingAccountId,
    setReceivingAccountId,
    note,
    setNote,
    isSubmitting,
    setIsSubmitting,
    generalError,
    setGeneralError,
    confirmOverdraft,
    setConfirmOverdraft,
    crossBankData,
    setCrossBankData,
    shortfallEvent,
    setShortfallEvent,
    todayStr,
    pools,
    rawCategories: [] as unknown[],
    bankAccounts,
    everydayPool,
    expensePresets,
    incomePresets,
    transferPresets,
    handleSelectPreset,
    posthog,
    utils,
    recordExpenseMutation,
    createOneOffExpenseMut,
    createUpcomingIncomeMutation,
    createIncomeSourceMut,
    moveMoneyMutation,
    createTransferSourceMut,
  };
}
