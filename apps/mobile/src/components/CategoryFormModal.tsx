import React, { useState, useEffect, useMemo } from 'react';
import {
  MobileModalDialog,
  showMobileConfirm,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';
import { formatIsoDate } from '../lib/format';
import { CategoryFormFields } from './categories/form/CategoryFormFields';
import { CategoryFormFooter } from './categories/form/CategoryFormFooter';

export interface CategoryItem {
  id: string;
  name: string;
  type: 'GOAL' | 'REGULAR' | 'EVERYDAY';
  targetAmount?: string | null;
  targetDate?: string | null;
  monthlyAmount?: string | null;
  everydayTargetKeepAmount?: string | null;
  bankAccountId?: string | null;
  currentBalance?: string;
  everydayAllowanceAmount?: string | null;
  safetyBufferFloor?: string | null;
  healthStatus?: string | null;
  isSurplusTarget?: boolean | null;
}

interface CategoryFormModalProps {
  visible: boolean;
  categoryToEdit?: CategoryItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CategoryFormModal({ visible, categoryToEdit, onClose, onSuccess }: CategoryFormModalProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();

  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery(undefined, { enabled: visible });
  const bankAccounts = bankAccountsQuery.data ?? [];

  const isEdit = Boolean(categoryToEdit?.id);

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [type, setType] = useState<'GOAL' | 'REGULAR' | 'EVERYDAY'>('REGULAR');
  const [safetyBufferFloor, setSafetyBufferFloor] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [isSurplusTarget, setIsSurplusTarget] = useState(false);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setType(categoryToEdit.type);
      setBankAccountId(categoryToEdit.bankAccountId ?? '');
      setSafetyBufferFloor(categoryToEdit.safetyBufferFloor ?? '');
      setTargetAmount(categoryToEdit.targetAmount ?? '');
      setTargetDate(categoryToEdit.targetDate ? formatIsoDate(categoryToEdit.targetDate) : '');
      setIsSurplusTarget(categoryToEdit.isSurplusTarget ?? false);
    } else {
      setName('');
      setType('REGULAR');
      setBankAccountId('');
      setSafetyBufferFloor('');
      setTargetAmount('');
      setTargetDate('');
      setIsSurplusTarget(false);
    }
    setNameError('');
  }, [categoryToEdit, visible]);

  const createMut = trpc.createPool.useMutation({
    onSuccess: () => {
      utils.listPools.invalidate();
      toast.success(t('toasts.created'));
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || t('categories.saveFailed'));
    },
  });

  const updateMut = trpc.updatePool.useMutation({
    onSuccess: () => {
      utils.listPools.invalidate();
      toast.success(t('toasts.saved'));
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || t('categories.saveFailed'));
    },
  });

  const archiveMut = trpc.archivePool.useMutation({
    onSuccess: () => {
      utils.listPools.invalidate();
      toast.success(t('toasts.archived'));
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || t('categories.failedToArchive'));
    },
  });

  const isValid = useMemo(() => {
    if (!name.trim()) return false;
    if (!isEdit && !bankAccountId) return false;
    if (type === 'GOAL') {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return false;
      if (!targetDate) return false;
    }
    return true;
  }, [name, isEdit, bankAccountId, type, targetAmount, targetDate]);

  const isDirty = useMemo(() => {
    if (!isEdit) {
      return Boolean(name.trim() || bankAccountId || safetyBufferFloor || targetAmount || targetDate || isSurplusTarget);
    }
    if (!categoryToEdit) return false;
    const initialName = categoryToEdit.name || '';
    const initialTarget = categoryToEdit.targetAmount || '';
    const initialFloor = categoryToEdit.safetyBufferFloor || '';
    const initialDate = categoryToEdit.targetDate ? formatIsoDate(categoryToEdit.targetDate) : '';
    const initialSurplus = categoryToEdit.isSurplusTarget ?? false;

    return (
      name.trim() !== initialName ||
      safetyBufferFloor !== initialFloor ||
      targetAmount !== initialTarget ||
      targetDate !== initialDate ||
      isSurplusTarget !== initialSurplus
    );
  }, [isEdit, categoryToEdit, name, bankAccountId, safetyBufferFloor, targetAmount, targetDate, isSurplusTarget]);

  const isSurplusDisabled = Boolean(isEdit && categoryToEdit?.isSurplusTarget);

  const handleSubmit = () => {
    if (!name.trim()) {
      setNameError(t('categories.nameRequired'));
      return;
    }
    if (!isEdit && !bankAccountId) {
      toast.error(t('categories.bankAccountRequired'));
      return;
    }
    if (type === 'GOAL') {
      if (!targetAmount || parseFloat(targetAmount) <= 0) {
        toast.error(t('categories.goalAmountRequired'));
        return;
      }
      if (!targetDate) {
        toast.error(t('categories.goalDateRequired'));
        return;
      }
    }
    setNameError('');

    if (categoryToEdit) {
      updateMut.mutate({
        poolId: categoryToEdit.id,
        data: {
          name: name.trim(),
          safetyBufferFloor: type === 'EVERYDAY' ? safetyBufferFloor || '0.00' : undefined,
          targetAmount: type === 'GOAL' && targetAmount ? parseFloat(targetAmount).toFixed(2) : undefined,
          targetDate: type === 'GOAL' && targetDate ? targetDate : undefined,
          isSurplusTarget: type !== 'EVERYDAY' ? isSurplusTarget : undefined,
        },
      });
    } else {
      createMut.mutate({
        name: name.trim(),
        poolType: type,
        bankAccountId,
        safetyBufferFloor: type === 'EVERYDAY' ? safetyBufferFloor || '0.00' : undefined,
        targetAmount: type === 'GOAL' && targetAmount ? parseFloat(targetAmount).toFixed(2) : undefined,
        targetDate: type === 'GOAL' && targetDate ? targetDate : undefined,
        isSurplusTarget: type !== 'EVERYDAY' ? isSurplusTarget : undefined,
      });
    }
  };

  const handleArchive = () => {
    if (!categoryToEdit) return;
    showMobileConfirm({
      title: t('categories.archivePool'),
      message: t('categories.archivePoolConfirm', { name: categoryToEdit.name }),
      confirmText: t('categories.archivePool'),
      isDestructive: true,
      onConfirm: () => {
        archiveMut.mutate({ poolId: categoryToEdit.id });
      },
    });
  };

  const isPending = createMut.isPending || updateMut.isPending || archiveMut.isPending;

  const typeOptions = [
    { key: 'EVERYDAY', label: t('categories.typeEveryday') },
    { key: 'REGULAR', label: t('categories.typeRegular') },
    { key: 'GOAL', label: t('categories.typeGoal') },
  ];

  const bankOptions = bankAccounts.map((acc) => ({
    key: acc.id,
    label: `${acc.name} ${acc.isPrivate ? t('categories.privateBadge') : t('categories.householdBadge')}`,
  }));

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={isEdit ? t('categories.editPoolTitle', { name: categoryToEdit?.name || '' }) : t('categories.createPool')}
      footer={
        <CategoryFormFooter
          isEdit={isEdit}
          isPending={isPending}
          isValid={isValid}
          isDirty={isDirty}
          onArchive={handleArchive}
          onSubmit={handleSubmit}
        />
      }
    >
      <CategoryFormFields
        name={name}
        setName={setName}
        nameError={nameError}
        setNameError={setNameError}
        type={type}
        setType={setType}
        safetyBufferFloor={safetyBufferFloor}
        setSafetyBufferFloor={setSafetyBufferFloor}
        targetAmount={targetAmount}
        setTargetAmount={setTargetAmount}
        targetDate={targetDate}
        setTargetDate={setTargetDate}
        bankAccountId={bankAccountId}
        setBankAccountId={setBankAccountId}
        isSurplusTarget={isSurplusTarget}
        setIsSurplusTarget={setIsSurplusTarget}
        isEdit={isEdit}
        isSurplusDisabled={isSurplusDisabled}
        typeOptions={typeOptions}
        bankOptions={bankOptions}
      />
    </MobileModalDialog>
  );
}
