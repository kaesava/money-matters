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
}

export interface CategoryItemModalProps {
  visible: boolean;
  poolId: string;
  categoryToEdit?: CategoryItemToEdit | null;
  onClose: () => void;
  onSuccess?: () => void;
}

type FrequencyOption = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY';

export function CategoryItemModal({
  visible,
  poolId,
  categoryToEdit,
  onClose,
  onSuccess,
}: CategoryItemModalProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const isEdit = Boolean(categoryToEdit?.id);

  const [name, setName] = useState('');
  const [enteredAmount, setEnteredAmount] = useState('');
  const [frequency, setFrequency] = useState<FrequencyOption>('MONTHLY');
  const [isEssential, setIsEssential] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (categoryToEdit) {
        setName(categoryToEdit.name || '');
        setEnteredAmount(
          categoryToEdit.enteredAmount || categoryToEdit.monthlyAmount || ''
        );
        setFrequency((categoryToEdit.budgetFrequency as FrequencyOption) || 'MONTHLY');
        setIsEssential(Boolean(categoryToEdit.isEssential));
      } else {
        setName('');
        setEnteredAmount('');
        setFrequency('MONTHLY');
        setIsEssential(false);
      }
    }
  }, [visible, categoryToEdit]);

  const createMut = trpc.createCategory.useMutation();
  const updateMut = trpc.updateCategory.useMutation();

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
    const origAmount = categoryToEdit.enteredAmount || categoryToEdit.monthlyAmount || '';
    const origFreq = (categoryToEdit.budgetFrequency as FrequencyOption) || 'MONTHLY';
    const origEssential = Boolean(categoryToEdit.isEssential);

    return (
      name.trim() !== origName ||
      enteredAmount !== origAmount ||
      frequency !== origFreq ||
      isEssential !== origEssential
    );
  }, [isEdit, categoryToEdit, name, enteredAmount, frequency, isEssential]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('categories.nameRequired'), t('common.error'));
      return;
    }

    const numAmt = parseFloat(enteredAmount);

    setSubmitting(true);
    try {
      if (isEdit && categoryToEdit?.id) {
        await updateMut.mutateAsync({
          categoryId: categoryToEdit.id,
          data: {
            name: name.trim(),
            enteredAmount: !isNaN(numAmt) && numAmt > 0 ? numAmt.toFixed(2) : undefined,
            monthlyAmount: !isNaN(parseFloat(calculatedMonthly)) && parseFloat(calculatedMonthly) > 0 ? calculatedMonthly : undefined,
            budgetFrequency: frequency,
            isEssential,
          },
        });
      } else {
        await createMut.mutateAsync({
          poolId,
          name: name.trim(),
          enteredAmount: !isNaN(numAmt) && numAmt > 0 ? numAmt.toFixed(2) : undefined,
          monthlyAmount: !isNaN(parseFloat(calculatedMonthly)) && parseFloat(calculatedMonthly) > 0 ? calculatedMonthly : undefined,
          budgetFrequency: frequency,
          isEssential,
        });
      }

      toast.success(isEdit ? t('toasts.saved') : t('toasts.created'));
      utils.listCategories.invalidate();
      utils.listPools.invalidate();
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

  const archiveMut = trpc.archiveCategory.useMutation({
    onSuccess: () => {
      utils.listCategories.invalidate();
      utils.listPools.invalidate();
      toast.success(t('toasts.archived'));
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || t('categories.failedToArchive'));
    },
  });

  const handleArchive = () => {
    if (!categoryToEdit?.id) return;
    showMobileConfirm({
      title: t('categories.archiveCategory'),
      message: t('categories.archiveCategoryConfirm', { name: categoryToEdit.name || '' }),
      confirmText: t('categories.archiveCategory'),
      isDestructive: true,
      onConfirm: () => {
        archiveMut.mutate({ categoryId: categoryToEdit.id! });
      },
    });
  };

  const isPending = submitting || archiveMut.isPending;

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
          enteredAmount={enteredAmount}
          setEnteredAmount={setEnteredAmount}
          frequency={frequency}
          setFrequency={setFrequency}
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
