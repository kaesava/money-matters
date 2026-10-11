import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView } from 'react-native';
import {
  MobileModalDialog,
  useMobileToast,
  showMobileConfirm,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';
import { CategoryItemFields } from './categories/form/CategoryItemFields';
import { CategoryItemFooter } from './categories/form/CategoryItemFooter';

export interface CategoryItemToEdit {
  id?: string;
  name?: string;
  poolId?: string;
  monthlyAmount?: string | null;
  enteredAmount?: string | null;
  budgetFrequency?: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY' | null;
  isEssential?: boolean;
  startDate?: string | null;
}

export interface CategoryItemModalProps {
  visible: boolean;
  poolId?: string;
  categoryToEdit?: CategoryItemToEdit | null;
  limitToPoolType?: 'REGULAR' | 'EVERYDAY';
  onClose: () => void;
  onSuccess?: () => void;
}

type FrequencyOption = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY';

function getDefaultStartDateAest(): string {
  const d = new Date();
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(nextMonth);
}

export function CategoryItemModal({
  visible,
  poolId,
  categoryToEdit,
  limitToPoolType,
  onClose,
  onSuccess,
}: CategoryItemModalProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const isEdit = Boolean(categoryToEdit?.id);

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: visible });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: visible });
  const availablePools = useMemo(() => {
    return (poolsQuery.data ?? []).filter((p) => {
      const type = p.envelopeType;
      if (type === 'TARGET_GOAL' || type === 'ONGOING_GOAL') return false;
      if (limitToPoolType) return type === limitToPoolType;
      return true;
    });
  }, [poolsQuery.data, limitToPoolType]);

  const [name, setName] = useState('');
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [enteredAmount, setEnteredAmount] = useState('');
  const [frequency, setFrequency] = useState<FrequencyOption>('MONTHLY');
  const [startDate, setStartDate] = useState(getDefaultStartDateAest());
  const [isEssential, setIsEssential] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activePoolId = poolId || selectedPoolId;
  const activePool = availablePools.find((p) => p.id === activePoolId);
  const isBillsPool = activePool?.envelopeType === 'SCHEDULED_BILL' || activePool?.envelopeType === 'FLEXIBLE_BILL';
  const defaultBankAccountId = activePool?.bankAccountId || bankAccountsQuery.data?.[0]?.id || '';

  useEffect(() => {
    if (visible) {
      if (categoryToEdit) {
        setName(categoryToEdit.name || '');
        setSelectedPoolId(categoryToEdit.poolId || poolId || '');
        setEnteredAmount(
          categoryToEdit.enteredAmount || categoryToEdit.monthlyAmount || ''
        );
        setFrequency((categoryToEdit.budgetFrequency as FrequencyOption) || 'MONTHLY');
        setIsEssential(Boolean(categoryToEdit.isEssential));
        setStartDate(categoryToEdit.startDate || getDefaultStartDateAest());
      } else {
        setName('');
        setSelectedPoolId(poolId || availablePools[0]?.id || '');
        setEnteredAmount('');
        setFrequency('MONTHLY');
        setStartDate(getDefaultStartDateAest());
        setIsEssential(false);
      }
    }
  }, [visible, categoryToEdit, poolId, availablePools]);

  const createEnvelopeMut = trpc.createEnvelope.useMutation();
  const updateEnvelopeMut = trpc.updateEnvelope.useMutation();
  const archiveEnvelopeMut = trpc.archiveEnvelope.useMutation();

  const calculatedMonthly = useMemo(() => {
    const numAmt = parseFloat(enteredAmount);
    if (isNaN(numAmt) || numAmt <= 0) return '0.00';
    let monthlyAmt = numAmt;
    if (frequency === 'WEEKLY') monthlyAmt = (numAmt * 52) / 12;
    else if (frequency === 'FORTNIGHTLY') monthlyAmt = (numAmt * 26) / 12;
    else if (frequency === 'ANNUALLY') monthlyAmt = numAmt / 12;
    return monthlyAmt.toFixed(2);
  }, [enteredAmount, frequency]);

  const isDirty = useMemo(() => {
    if (!isEdit) {
      return Boolean(name.trim() || enteredAmount.trim());
    }
    if (!categoryToEdit) return false;
    const origName = categoryToEdit.name || '';
    const origPool = categoryToEdit.poolId || poolId || '';
    const origAmount = categoryToEdit.enteredAmount || categoryToEdit.monthlyAmount || '';
    const origFreq = (categoryToEdit.budgetFrequency as FrequencyOption) || 'MONTHLY';
    const origEssential = Boolean(categoryToEdit.isEssential);

    return (
      name.trim() !== origName ||
      selectedPoolId !== origPool ||
      enteredAmount !== origAmount ||
      frequency !== origFreq ||
      isEssential !== origEssential
    );
  }, [isEdit, categoryToEdit, name, selectedPoolId, poolId, enteredAmount, frequency, isEssential]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('categories.nameRequired'), t('common.error'));
      return;
    }

    const numAmt = parseFloat(enteredAmount);

    setSubmitting(true);
    try {
      if (isEdit && categoryToEdit?.id) {
        await updateEnvelopeMut.mutateAsync({
          envelopeId: categoryToEdit.id,
          data: {
            name: name.trim(),
            enteredAmount: !isNaN(numAmt) && numAmt > 0 ? numAmt.toFixed(2) : undefined,
            monthlyAmount: !isNaN(parseFloat(calculatedMonthly)) && parseFloat(calculatedMonthly) > 0 ? calculatedMonthly : undefined,
            budgetFrequency: frequency,
            startDate: isBillsPool ? startDate : undefined,
            isEssential,
          },
        });
      } else {
        await createEnvelopeMut.mutateAsync({
          name: name.trim(),
          bankAccountId: defaultBankAccountId,
          envelopeType: isBillsPool ? 'SCHEDULED_BILL' : 'EVERYDAY',
          monthlyAmount: !isNaN(parseFloat(calculatedMonthly)) && parseFloat(calculatedMonthly) > 0 ? calculatedMonthly : undefined,
          enteredAmount: !isNaN(numAmt) && numAmt > 0 ? numAmt.toFixed(2) : undefined,
          budgetFrequency: frequency,
          startDate: isBillsPool ? startDate : undefined,
          isEssential,
        });
      }

      toast.success(isEdit ? t('toasts.saved') : t('toasts.created'));
      utils.listPools.invalidate();
      utils.listBillSchedules.invalidate();
      utils.listExpenseEvents.invalidate();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('categories.saveFailed'),
        t('common.error')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const freqOptions = [
    { key: 'WEEKLY', label: t('categories.frequencyWeekly') },
    { key: 'FORTNIGHTLY', label: t('categories.frequencyFortnightly') },
    { key: 'MONTHLY', label: t('categories.frequencyMonthly') },
    { key: 'ANNUALLY', label: t('categories.frequencyAnnually') },
  ];

  const handleArchive = () => {
    if (!categoryToEdit?.id) return;
    showMobileConfirm({
      title: t('categories.archiveCategory'),
      message: t('categories.archiveCategoryConfirm', { name: categoryToEdit.name || '' }),
      confirmText: t('categories.archiveCategory'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          await archiveEnvelopeMut.mutateAsync({ envelopeId: categoryToEdit.id! });
          utils.listPools.invalidate();
          utils.listBillSchedules.invalidate();
          utils.listExpenseEvents.invalidate();
          toast.success(t('toasts.archived'));
          onSuccess?.();
          onClose();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('categories.failedToArchive'));
        }
      },
    });
  };

  const isPending = submitting || archiveEnvelopeMut.isPending;

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={isEdit ? t('categories.editTitle', { name: categoryToEdit?.name || '' }) : t('categories.addCategory')}
      subtitle={
        isEdit
          ? t('categories.updateSubtitle')
          : t('categories.createSubtitle')
      }
      footer={
        <CategoryItemFooter
          isEdit={isEdit}
          isPending={isPending}
          canSubmit={Boolean(name.trim() && enteredAmount.trim())}
          onArchive={handleArchive}
          onSubmit={handleSubmit}
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <CategoryItemFields
          name={name}
          setName={setName}
          selectedPoolId={selectedPoolId}
          setSelectedPoolId={setSelectedPoolId}
          availablePools={availablePools}
          showPoolPicker={!poolId && !isEdit}
          enteredAmount={enteredAmount}
          setEnteredAmount={setEnteredAmount}
          frequency={frequency}
          setFrequency={setFrequency}
          startDate={startDate}
          setStartDate={setStartDate}
          isBillsPool={isBillsPool}
          isEssential={isEssential}
          setIsEssential={setIsEssential}
          calculatedMonthly={calculatedMonthly}
          isEdit={isEdit}
          freqOptions={freqOptions}
        />
      </ScrollView>
    </MobileModalDialog>
  );
}

export default CategoryItemModal;
