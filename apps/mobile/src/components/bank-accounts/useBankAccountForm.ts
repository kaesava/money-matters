import React, { useState, useEffect } from 'react';
import { trpc } from '../../lib/trpc';
import { useMobileToast, showMobileConfirm } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import type { BankAccountItemToEdit, SupportedBankProvider } from './bankAccountTypes';
import type { MobileReconciliationModalProps } from '../categories/MobileReconciliationModal';

export function useBankAccountForm(
  visible: boolean,
  accountToEdit: BankAccountItemToEdit | null | undefined,
  onClose: () => void,
  onSuccess?: () => void,
  onNeedsReconciliation?: (account: NonNullable<MobileReconciliationModalProps['account']>) => void
) {
  const isEdit = Boolean(accountToEdit?.id);
  const toast = useMobileToast();
  const utils = trpc.useUtils();

  const [name, setName] = useState('');
  const [provider, setProvider] = useState<SupportedBankProvider>('CBA');
  const [balance, setBalance] = useState('0.00');
  const [buffer, setBuffer] = useState('0.00');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: visible });
  const allPools = poolsQuery.data || [];
  const linkedPools = isEdit && accountToEdit
    ? allPools.filter((p) => p.bankAccountId === accountToEdit.id)
    : [];

  const initialRef = React.useRef({
    name: '',
    provider: 'CBA' as SupportedBankProvider,
    balance: '0.00',
    buffer: '0.00',
    isPrivate: false,
  });

  useEffect(() => {
    if (accountToEdit) {
      const initName = accountToEdit.name || '';
      const initProvider = (accountToEdit.bankProvider as SupportedBankProvider) || 'CBA';
      const initBalance = accountToEdit.lastKnownBalance || '0.00';
      const initBuffer = accountToEdit.unbudgetedBuffer || '0.00';
      const initPrivate = Boolean(accountToEdit.isPrivate);

      setName(initName);
      setProvider(initProvider);
      setBalance(initBalance);
      setBuffer(initBuffer);
      setIsPrivate(initPrivate);

      initialRef.current = {
        name: initName,
        provider: initProvider,
        balance: initBalance,
        buffer: initBuffer,
        isPrivate: initPrivate,
      };
    } else {
      setName('');
      setProvider('CBA');
      setBalance('0.00');
      setBuffer('0.00');
      setIsPrivate(false);

      initialRef.current = {
        name: '',
        provider: 'CBA',
        balance: '0.00',
        buffer: '0.00',
        isPrivate: false,
      };
    }
    setNameError('');
    setGeneralError('');
  }, [accountToEdit, visible]);

  const isDirty =
    name !== initialRef.current.name ||
    provider !== initialRef.current.provider ||
    balance !== initialRef.current.balance ||
    buffer !== initialRef.current.buffer ||
    isPrivate !== initialRef.current.isPrivate;

  const balNum = parseFloat(balance) || 0;
  const bufNum = parseFloat(buffer) || 0;
  const availableToBudget = Math.max(0, balNum - bufNum);
  const isNegativeAvailable = balNum < bufNum;

  const linkedPoolsTotal = linkedPools.reduce(
    (sum, p) => sum + (typeof p.currentBalance === 'number' ? p.currentBalance : parseFloat(String(p.currentBalance || '0'))),
    0
  );
  const diffBeforeSave = Number((availableToBudget - linkedPoolsTotal).toFixed(2));
  const hasVariance = linkedPools.length > 0 && Math.abs(diffBeforeSave) > 0.009;

  const createMut = trpc.createBankAccount.useMutation();
  const updateMut = trpc.updateBankAccount.useMutation();
  const archiveMut = trpc.archiveBankAccount.useMutation();

  const handleArchive = () => {
    if (!accountToEdit) return;
    showMobileConfirm({
      title: t('settings.bankAccounts.deleteConfirmTitle'),
      message: t('settings.bankAccounts.deleteConfirmBody', { name: accountToEdit.name }),
      confirmText: t('common.archive'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          await archiveMut.mutateAsync({ accountId: accountToEdit.id });
          toast.success(t('toasts.archived'));
          utils.listBankAccountsWithExpected.invalidate();
          onSuccess?.();
          onClose();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('common.error'));
        }
      },
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError(t('drawers.quickExpense.nameRequired'));
      return;
    }
    if (isNegativeAvailable) {
      setGeneralError(t('settings.bankAccountForm.bufferExceedsBalance'));
      return;
    }

    setSubmitting(true);
    setGeneralError('');

    try {
      let savedId = accountToEdit?.id;
      if (isEdit && accountToEdit?.id) {
        await updateMut.mutateAsync({
          accountId: accountToEdit.id,
          data: {
            name: name.trim(),
            bankProvider: provider,
            lastKnownBalance: balNum.toFixed(2),
            unbudgetedBuffer: bufNum.toFixed(2),
            isPrivate,
          },
        });
      } else {
        const created = await createMut.mutateAsync({
          name: name.trim(),
          bankProvider: provider,
          lastKnownBalance: balNum.toFixed(2),
          unbudgetedBuffer: bufNum.toFixed(2),
          isPrivate,
        });
        savedId = created.id;
      }

      toast.success(t('toasts.saved'));
      utils.listBankAccountsWithExpected.invalidate();
      onSuccess?.();
      onClose();

      if (hasVariance && savedId) {
        onNeedsReconciliation?.({
          id: savedId,
          name: name.trim(),
          lastKnownBalance: balNum.toFixed(2),
          unbudgetedBuffer: bufNum.toFixed(2),
          expectedBalance: linkedPoolsTotal,
          linkedPools: linkedPools.map((p) => ({
            id: p.id,
            name: p.name,
            poolType: p.poolType,
            currentBalance: p.currentBalance || 0,
            isSurplusTarget: p.isSurplusTarget,
          })),
        });
      }
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    isEdit,
    isDirty,
    name,
    setName,
    provider,
    setProvider,
    balance,
    setBalance,
    buffer,
    setBuffer,
    isPrivate,
    setIsPrivate,
    submitting,
    nameError,
    setNameError,
    generalError,
    allPools,
    linkedPools,
    availableToBudget,
    isNegativeAvailable,
    linkedPoolsTotal,
    hasVariance,
    diffBeforeSave,
    handleArchive,
    handleSubmit,
  };
}
