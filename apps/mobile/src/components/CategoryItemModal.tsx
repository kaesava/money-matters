import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
} from 'react-native';
import {
  MobileModalDialog,
  MobileInput,
  AmountInput,
  ChipSelect,
  MobileButton,
  FormLabel,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';

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
        <MobileButton
          variant="primary"
          loading={submitting}
          disabled={!name.trim() || !enteredAmount.trim() || submitting}
          onPress={handleSubmit}
        >
          {isEdit ? t('categories.saveCategory') : t('categories.createButton')}
        </MobileButton>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
        {/* Name */}
        <MobileInput
          label={t('categories.nameLabel')}
          required
          placeholder={t('categories.namePlaceholder')}
          value={name}
          onChangeText={setName}
          autoFocus={!isEdit}
        />

        {/* Amount */}
        <AmountInput
          label={t('categories.targetAmountLabel')}
          required
          placeholder="0.00"
          value={enteredAmount}
          onChangeText={setEnteredAmount}
        />

        {/* Frequency Chips */}
        <View style={styles.inputGroup}>
          <FormLabel>{t('categories.frequencyLabel')}</FormLabel>
          <ChipSelect
            options={freqOptions}
            value={frequency}
            onChange={(val) => setFrequency(val as FrequencyOption)}
          />
        </View>

        {/* Monthly Equivalent Banner if not monthly */}
        {enteredAmount && parseFloat(enteredAmount) > 0 && frequency !== 'MONTHLY' && (
          <View style={styles.equivBanner}>
            <Text style={styles.equivLabel}>{t('categories.monthlyEquivalent')}</Text>
            <Text style={styles.equivVal}>${calculatedMonthly} / mo</Text>
          </View>
        )}

        {/* Essential Bill Toggle */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.switchLabel}>{t('categories.prioritiseCategory')}</Text>
            <Text style={styles.switchSubtext}>
              {t('categories.priorityCategoryInfo')}
            </Text>
          </View>
          <Switch
            value={isEssential}
            onValueChange={setIsEssential}
            trackColor={{ false: '#E2E8F0', true: '#2563eb' }}
          />
        </View>
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 14,
    paddingBottom: 10,
  },
  inputGroup: {
    gap: 4,
  },
  equivBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  equivLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  equivVal: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#2563eb',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  switchSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});

export default CategoryItemModal;
