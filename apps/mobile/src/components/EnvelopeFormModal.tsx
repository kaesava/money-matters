import React, { useState, useEffect, useMemo } from 'react';
import {
  MobileModalDialog,
  showMobileConfirm,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';
import { formatIsoDate } from '../lib/format';
import { EnvelopeFormFields } from './envelopes/form/EnvelopeFormFields';
import { EnvelopeFormFooter } from './envelopes/form/EnvelopeFormFooter';

export interface EnvelopeItem {
  id: string;
  name: string;
  type: 'GOAL' | 'REGULAR' | 'EVERYDAY' | string;
  poolType?: string;
  envelopeType?: string;
  targetAmount?: string | null;
  targetDate?: string | null;
  endDate?: string | null;
  enteredAmount?: string | null;
  budgetFrequency?: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY' | string | null;
  startDate?: string | null;
  rrule?: string | null;
  goalMode?: 'TARGET_DATE' | 'ONGOING' | null;
  monthlyAmount?: string | null;
  everydayTargetKeepAmount?: string | null;
  bankAccountId?: string | null;
  currentBalance?: string;
  safetyBufferFloor?: string | null;
  healthStatus?: string | null;
  isSurplusTarget?: boolean | null;
}

export type CategoryItem = EnvelopeItem;

export interface EnvelopeFormModalProps {
  visible: boolean;
  envelopeToEdit?: EnvelopeItem | null;
  categoryToEdit?: EnvelopeItem | null;
  defaultType?: 'GOAL' | 'REGULAR' | 'EVERYDAY';
  onClose: () => void;
  onSuccess?: () => void;
}

export type CategoryFormModalProps = EnvelopeFormModalProps;

export function EnvelopeFormModal({
  visible,
  envelopeToEdit,
  categoryToEdit: legacyCategoryToEdit,
  defaultType,
  onClose,
  onSuccess,
}: EnvelopeFormModalProps) {
  const categoryToEdit = envelopeToEdit ?? legacyCategoryToEdit;
  const toast = useMobileToast();
  const utils = trpc.useUtils();

  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery(undefined, { enabled: visible });
  const bankAccounts = bankAccountsQuery.data ?? [];

  const isEdit = Boolean(categoryToEdit?.id);

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [type, setType] = useState<'GOAL' | 'REGULAR' | 'EVERYDAY'>(defaultType || 'REGULAR');
  const [safetyBufferFloor, setSafetyBufferFloor] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [goalMode, setGoalMode] = useState<'TARGET_DATE' | 'ONGOING'>('TARGET_DATE');
  const [billMode, setBillMode] = useState<'SCHEDULED_BILL' | 'FLEXIBLE_BILL'>('SCHEDULED_BILL');
  const [frequency, setFrequency] = useState<'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY'>('MONTHLY');
  const [interval, setInterval] = useState(1);
  const [goalStartDate, setGoalStartDate] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [isSurplusTarget, setIsSurplusTarget] = useState(false);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || '');
      const rawEnvelopeType = categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || 'REGULAR';
      const resolvedType: 'GOAL' | 'REGULAR' | 'EVERYDAY' =
        rawEnvelopeType === 'EVERYDAY'
          ? 'EVERYDAY'
          : rawEnvelopeType === 'TARGET_GOAL' || rawEnvelopeType === 'ONGOING_GOAL' || rawEnvelopeType.includes('GOAL')
          ? 'GOAL'
          : 'REGULAR';
      setType(resolvedType);
      const resolvedBillMode: 'SCHEDULED_BILL' | 'FLEXIBLE_BILL' =
        rawEnvelopeType === 'FLEXIBLE_BILL' ? 'FLEXIBLE_BILL' : 'SCHEDULED_BILL';
      setBillMode(resolvedBillMode);
      setBankAccountId(categoryToEdit.bankAccountId ?? '');
      setSafetyBufferFloor(categoryToEdit.safetyBufferFloor ?? '');
      setTargetAmount((categoryToEdit.enteredAmount || categoryToEdit.targetAmount) ?? '');
      const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || '';
      setTargetDate(rawDate ? formatIsoDate(rawDate) : '');
      const resolvedGoalMode: 'TARGET_DATE' | 'ONGOING' =
        categoryToEdit.goalMode === 'ONGOING' || rawEnvelopeType === 'ONGOING_GOAL' ? 'ONGOING' : 'TARGET_DATE';
      setGoalMode(resolvedGoalMode);
      setFrequency((categoryToEdit.budgetFrequency as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY') || 'MONTHLY');
      const rawStartDate = categoryToEdit.startDate || '';
      setGoalStartDate(rawStartDate ? formatIsoDate(rawStartDate) : '');
      if (categoryToEdit.rrule) {
        const match = categoryToEdit.rrule.match(/INTERVAL=(\d+)/);
        setInterval(match ? parseInt(match[1], 10) : 1);
      } else {
        setInterval(1);
      }
      setIsSurplusTarget(categoryToEdit.isSurplusTarget ?? false);
    } else {
      setName('');
      setType(defaultType || 'REGULAR');
      setBillMode('SCHEDULED_BILL');
      setBankAccountId('');
      setSafetyBufferFloor('');
      setTargetAmount('');
      setTargetDate('');
      setGoalMode('TARGET_DATE');
      setFrequency('MONTHLY');
      setInterval(1);
      setGoalStartDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date()));
      setIsSurplusTarget(false);
    }
    setNameError('');
  }, [categoryToEdit, defaultType, visible]);

  const calculatedMonthly = useMemo(() => {
    const val = parseFloat(targetAmount);
    if (isNaN(val) || val <= 0) return '0.00';
    const intVal = Math.max(1, interval);
    let monthly = val;
    if (frequency === 'WEEKLY') monthly = (val * (52 / intVal)) / 12;
    else if (frequency === 'FORTNIGHTLY') monthly = (val * (26 / intVal)) / 12;
    else if (frequency === 'MONTHLY') monthly = val / intVal;
    else if (frequency === 'ANNUALLY') monthly = val / (12 * intVal);
    return monthly.toFixed(2);
  }, [targetAmount, frequency, interval]);

  const rruleString = useMemo(() => {
    const isScheduledBill = type === 'REGULAR' && billMode === 'SCHEDULED_BILL';
    const isOngoingGoal = type === 'GOAL' && goalMode === 'ONGOING';
    if (!isScheduledBill && !isOngoingGoal) return null;
    let freqStr = 'FREQ=MONTHLY';
    let intVal = Math.max(1, interval);
    if (frequency === 'WEEKLY') freqStr = 'FREQ=WEEKLY';
    if (frequency === 'FORTNIGHTLY') {
      freqStr = 'FREQ=WEEKLY';
      intVal = intVal * 2;
    }
    if (frequency === 'ANNUALLY') freqStr = 'FREQ=YEARLY';
    return intVal > 1 ? `${freqStr};INTERVAL=${intVal}` : freqStr;
  }, [type, billMode, goalMode, frequency, interval]);

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
      if (goalMode === 'TARGET_DATE' && !targetDate) return false;
    }
    if (type === 'REGULAR') {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return false;
      if (billMode === 'SCHEDULED_BILL' && !goalStartDate) return false;
    }
    return true;
  }, [name, isEdit, bankAccountId, type, billMode, targetAmount, goalMode, targetDate, goalStartDate]);

  const isDirty = useMemo(() => {
    if (!isEdit) {
      return Boolean(
        name.trim() ||
        bankAccountId ||
        safetyBufferFloor.trim() ||
        targetAmount.trim() ||
        targetDate ||
        isSurplusTarget ||
        type !== (defaultType || 'REGULAR') ||
        billMode !== 'SCHEDULED_BILL' ||
        goalMode !== 'TARGET_DATE' ||
        frequency !== 'MONTHLY' ||
        interval !== 1
      );
    }
    if (!categoryToEdit) return false;
    const initialName = (categoryToEdit.name || '').trim();
    const initialTarget = ((categoryToEdit.enteredAmount || categoryToEdit.targetAmount) ?? '').trim();
    const initialFloor = (categoryToEdit.safetyBufferFloor ?? '').trim();
    const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || '';
    const initialDate = rawDate ? formatIsoDate(rawDate) : '';
    const initialSurplus = categoryToEdit.isSurplusTarget ?? false;
    const rawEnvelopeType = categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || 'REGULAR';
    const initialGoalMode: 'TARGET_DATE' | 'ONGOING' =
      categoryToEdit.goalMode === 'ONGOING' || rawEnvelopeType === 'ONGOING_GOAL' ? 'ONGOING' : 'TARGET_DATE';
    const initialBillMode: 'SCHEDULED_BILL' | 'FLEXIBLE_BILL' =
      rawEnvelopeType === 'FLEXIBLE_BILL' ? 'FLEXIBLE_BILL' : 'SCHEDULED_BILL';
    const initialFreq = categoryToEdit.budgetFrequency || 'MONTHLY';
    const rawStartDate = categoryToEdit.startDate || '';
    const initialStartDate = rawStartDate ? formatIsoDate(rawStartDate) : '';
    let initialInterval = 1;
    if (categoryToEdit.rrule) {
      const match = categoryToEdit.rrule.match(/INTERVAL=(\d+)/);
      initialInterval = match ? parseInt(match[1], 10) : 1;
    }

    return (
      name.trim() !== initialName ||
      safetyBufferFloor.trim() !== initialFloor ||
      targetAmount.trim() !== initialTarget ||
      targetDate !== initialDate ||
      goalMode !== initialGoalMode ||
      billMode !== initialBillMode ||
      frequency !== initialFreq ||
      interval !== initialInterval ||
      goalStartDate !== initialStartDate ||
      isSurplusTarget !== initialSurplus
    );
  }, [
    isEdit,
    categoryToEdit,
    name,
    bankAccountId,
    safetyBufferFloor,
    targetAmount,
    targetDate,
    goalMode,
    billMode,
    frequency,
    interval,
    goalStartDate,
    isSurplusTarget,
    type,
    defaultType,
  ]);

  const isSurplusDisabled = Boolean(isEdit && categoryToEdit?.isSurplusTarget);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setNameError(t('categories.nameRequired'));
      return false;
    }
    if (!isEdit && !bankAccountId) {
      toast.error(t('categories.bankAccountRequired'));
      return false;
    }
    if (type === 'GOAL') {
      if (!targetAmount || parseFloat(targetAmount) <= 0) {
        toast.error(t('categories.goalAmountRequired'));
        return false;
      }
      if (goalMode === 'TARGET_DATE' && !targetDate) {
        toast.error(t('categories.goalDateRequired'));
        return false;
      }
    }
    if (type === 'REGULAR') {
      if (!targetAmount || parseFloat(targetAmount) <= 0) {
        toast.error(t('categories.billAmountRequired'));
        return false;
      }
      if (billMode === 'SCHEDULED_BILL' && !goalStartDate) {
        toast.error(t('categories.billStartDateRequired'));
        return false;
      }
    }
    setNameError('');
    return true;
  };

  const buildPayload = () => {
    const isScheduledBill = type === 'REGULAR' && billMode === 'SCHEDULED_BILL';
    const isFlexibleBill = type === 'REGULAR' && billMode === 'FLEXIBLE_BILL';
    const isOngoingGoal = type === 'GOAL' && goalMode === 'ONGOING';
    const isTargetGoal = type === 'GOAL' && goalMode === 'TARGET_DATE';

    const finalTargetAmount = isTargetGoal || isFlexibleBill
      ? parseFloat(targetAmount).toFixed(2)
      : isScheduledBill || isOngoingGoal
      ? calculatedMonthly
      : undefined;

    const enteredAmountVal = (isScheduledBill || isFlexibleBill || isOngoingGoal)
      ? parseFloat(targetAmount).toFixed(2)
      : undefined;

    const envelopeType: 'EVERYDAY' | 'SCHEDULED_BILL' | 'FLEXIBLE_BILL' | 'TARGET_GOAL' | 'ONGOING_GOAL' =
      type === 'EVERYDAY'
        ? 'EVERYDAY'
        : type === 'GOAL'
        ? goalMode === 'ONGOING'
          ? 'ONGOING_GOAL'
          : 'TARGET_GOAL'
        : billMode === 'FLEXIBLE_BILL'
        ? 'FLEXIBLE_BILL'
        : 'SCHEDULED_BILL';

    return {
      name: name.trim(),
      envelopeType,
      safetyBufferFloor: type === 'EVERYDAY' ? safetyBufferFloor || '0.00' : undefined,
      targetAmount: finalTargetAmount,
      monthlyAmount: isFlexibleBill ? finalTargetAmount : isScheduledBill ? calculatedMonthly : undefined,
      enteredAmount: enteredAmountVal,
      endDate: isTargetGoal ? targetDate || undefined : undefined,
      budgetFrequency: (isScheduledBill || isOngoingGoal) ? frequency : isFlexibleBill ? 'MONTHLY' : undefined,
      startDate: (isScheduledBill || isOngoingGoal) ? goalStartDate || undefined : undefined,
      rrule: (isScheduledBill || isOngoingGoal) ? rruleString || undefined : undefined,
      goalMode: type === 'GOAL' ? goalMode : undefined,
      isSurplusTarget: type !== 'EVERYDAY' ? isSurplusTarget : undefined,
    };
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    const payload = buildPayload();
    if (categoryToEdit) {
      updateMut.mutate({ poolId: categoryToEdit.id, data: payload });
    } else {
      createMut.mutate({ ...payload, bankAccountId });
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

  const typeOptions = isEdit
    ? [
        { key: 'EVERYDAY', label: t('categories.typeEveryday') },
        { key: 'REGULAR', label: t('categories.typeRegular') },
        { key: 'GOAL', label: t('categories.typeGoal') },
      ]
    : [
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
        <EnvelopeFormFooter
          isEdit={isEdit}
          showArchive={isEdit && type !== 'EVERYDAY'}
          isPending={isPending}
          isValid={isValid}
          isDirty={isDirty}
          onArchive={handleArchive}
          onSubmit={handleSubmit}
        />
      }
    >
      <EnvelopeFormFields
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
        goalMode={goalMode}
        setGoalMode={setGoalMode}
        billMode={billMode}
        setBillMode={setBillMode}
        frequency={frequency}
        setFrequency={setFrequency}
        interval={interval}
        setInterval={setInterval}
        goalStartDate={goalStartDate}
        setGoalStartDate={setGoalStartDate}
        calculatedMonthly={calculatedMonthly}
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

export const CategoryFormModal = EnvelopeFormModal;
