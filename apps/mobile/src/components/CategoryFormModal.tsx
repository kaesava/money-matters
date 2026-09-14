import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  MobileInput,
  AmountInput,
  ChipSelect,
  MobileButton,
  FormLabel,
  FormFieldError,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';
import { formatIsoDate } from '../lib/format';

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
  healthStatus?: string | null;
}

interface CategoryFormModalProps {
  visible: boolean;
  categoryToEdit?: CategoryItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CategoryFormModal({ visible, categoryToEdit, onClose, onSuccess }: CategoryFormModalProps) {
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery(undefined, { enabled: visible });
  const bankAccounts = bankAccountsQuery.data ?? [];

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [type, setType] = useState<'GOAL' | 'REGULAR' | 'EVERYDAY'>('GOAL');
  const [targetAmount, setTargetAmount] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [keepAmount, setKeepAmount] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setType(categoryToEdit.type);
      setTargetAmount(categoryToEdit.targetAmount ?? '');
      setMonthlyAmount(categoryToEdit.monthlyAmount ?? '');
      setTargetDate(categoryToEdit.targetDate ? formatIsoDate(categoryToEdit.targetDate) : '');
      setKeepAmount(categoryToEdit.everydayTargetKeepAmount ?? '');
      setBankAccountId(categoryToEdit.bankAccountId ?? '');
    } else {
      setName('');
      setType('GOAL');
      setTargetAmount('');
      setMonthlyAmount('');
      setTargetDate('');
      setKeepAmount('');
      setBankAccountId('');
    }
    setNameError('');
  }, [categoryToEdit, visible]);

  const createMut = trpc.createPool.useMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const updateMut = trpc.updatePool.useMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      setNameError(t('categories.nameRequired'));
      return;
    }
    setNameError('');

    const defaultBankAccountId = bankAccountId || bankAccounts[0]?.id || '';

    if (categoryToEdit) {
      updateMut.mutate({
        poolId: categoryToEdit.id,
        data: {
          name: name.trim(),
          targetAmount: (type === 'GOAL' || type === 'REGULAR') && (targetAmount || monthlyAmount) ? parseFloat(targetAmount || monthlyAmount).toFixed(2) : undefined,
          targetDate: type === 'GOAL' && targetDate ? targetDate : undefined,
          everydayAllowanceAmount: type === 'EVERYDAY' && keepAmount ? parseFloat(keepAmount).toFixed(2) : undefined,
        },
      });
    } else {
      createMut.mutate({
        name: name.trim(),
        poolType: type,
        bankAccountId: defaultBankAccountId,
        targetAmount: (type === 'GOAL' || type === 'REGULAR') && (targetAmount || monthlyAmount) ? parseFloat(targetAmount || monthlyAmount).toFixed(2) : undefined,
        targetDate: type === 'GOAL' && targetDate ? targetDate : undefined,
        everydayAllowanceAmount: type === 'EVERYDAY' && keepAmount ? parseFloat(keepAmount).toFixed(2) : undefined,
      });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const isDirty = Boolean(name.trim() || targetAmount.trim() || monthlyAmount.trim() || keepAmount.trim());

  const typeOptions = [
    { key: 'GOAL', label: t('categories.typeGoal') },
    { key: 'REGULAR', label: t('categories.typeRegular') },
    { key: 'EVERYDAY', label: t('categories.typeEveryday') },
  ];

  const bankOptions = [
    { key: '', label: '-- None --' },
    ...bankAccounts.map((acc) => ({ key: acc.id, label: acc.name })),
  ];

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={categoryToEdit ? t('modals.categoryForm.titleEdit') : t('modals.categoryForm.titleNew')}
      subtitle={categoryToEdit ? 'Update category properties' : 'Add a new savings goal or bill pool'}
      footer={
        <MobileButton
          variant="primary"
          loading={isPending}
          disabled={!name.trim()}
          onPress={handleSubmit}
        >
          {categoryToEdit ? t('common.saveChanges') : t('modals.categoryForm.submitNew')}
        </MobileButton>
      }
    >
      <View style={styles.content}>
        <MobileInput
          label={t('categories.nameLabel')}
          required
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (nameError) setNameError('');
          }}
          placeholder="e.g. Groceries, Netflix, Emergency Fund"
          error={nameError}
          autoFocus={!categoryToEdit}
        />

        <View style={styles.formGroup}>
          <FormLabel required>{t('modals.categoryForm.typeLabel')}</FormLabel>
          <ChipSelect
            options={typeOptions}
            value={type}
            onChange={(val) => setType(val as 'GOAL' | 'REGULAR' | 'EVERYDAY')}
            disabled={Boolean(categoryToEdit)}
          />
        </View>

        {type === 'GOAL' && (
          <>
            <AmountInput
              label={t('modals.categoryForm.targetLabel')}
              required
              value={targetAmount}
              onChangeText={setTargetAmount}
              placeholder="0.00"
            />
            <MobileInput
              label={t('categories.targetDateLabel')}
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="YYYY-MM-DD"
            />
          </>
        )}

        {type === 'REGULAR' && (
          <AmountInput
            label={t('categories.monthlyAmountLabel')}
            required
            value={monthlyAmount}
            onChangeText={setMonthlyAmount}
            placeholder="0.00"
          />
        )}

        {type === 'EVERYDAY' && (
          <AmountInput
            label={t('categories.targetKeepLabel')}
            required
            value={keepAmount}
            onChangeText={setKeepAmount}
            placeholder="500.00"
          />
        )}

        <View style={styles.formGroup}>
          <FormLabel>{t('categories.linkedAccountLabel')}</FormLabel>
          <ChipSelect
            options={bankOptions}
            value={bankAccountId}
            onChange={setBankAccountId}
            disabled={Boolean(categoryToEdit)}
          />
        </View>

        {Boolean(categoryToEdit) && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              {t('categories.immutabilityWarning', { defaultValue: 'Pool type and linked account cannot be changed once created.' })}
            </Text>
          </View>
        )}
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  formGroup: {
    gap: 2,
  },
  warningBox: {
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginTop: 4,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 16,
  },
});
