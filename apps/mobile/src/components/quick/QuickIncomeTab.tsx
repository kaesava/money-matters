import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  AmountInput,
  MobileDatePickerField,
  MobileInput,
  MobileButton,
  MobileBankPicker,
  DESIGN_TOKENS,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { QuickPresetItem } from './useMobileQuickAction';
import { QuickPresetsRow } from './QuickPresetsRow';

export interface QuickIncomeTabProps {
  name: string;
  setName: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  receivingAccountId: string;
  setReceivingAccountId: (v: string) => void;
  bankAccounts: Array<{ id: string; name: string; bankProvider?: string | null; currentBalance?: string | number | null }>;
  presets: { recent: QuickPresetItem[]; frequent: QuickPresetItem[] };
  onSelectPreset: (preset: QuickPresetItem) => void;
  isSubmitting: boolean;
  onSubmit: (splitImmediately: boolean) => void;
  onCancel: () => void;
}

export function QuickIncomeTab({
  name,
  setName,
  amount,
  setAmount,
  date,
  setDate,
  receivingAccountId,
  setReceivingAccountId,
  bankAccounts,
  presets,
  onSelectPreset,
  isSubmitting,
  onSubmit,
  onCancel,
}: QuickIncomeTabProps) {
  const [amountError, setAmountError] = useState('');
  const [nameError, setNameError] = useState('');
  const [bankError, setBankError] = useState('');

  const handleValidateAndSubmit = (splitImmediately: boolean) => {
    let hasError = false;
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setAmountError(t('drawers.quickExpense.validAmountError'));
      hasError = true;
    } else {
      setAmountError('');
    }

    if (!name.trim()) {
      setNameError(t('drawers.quickExpense.nameRequired'));
      hasError = true;
    } else {
      setNameError('');
    }

    if (!receivingAccountId) {
      setBankError(t('drawers.quickExpense.bankAccountRequired'));
      hasError = true;
    } else {
      setBankError('');
    }

    if (!hasError) {
      onSubmit(splitImmediately);
    }
  };

  const isFormValid =
    name.trim().length > 0 &&
    Boolean(receivingAccountId) &&
    amount.trim().length > 0 &&
    !isNaN(parseFloat(amount)) &&
    parseFloat(amount) > 0 &&
    Boolean(date);

  return (
    <View style={styles.container}>
      <QuickPresetsRow
        recentPresets={presets.recent}
        frequentPresets={presets.frequent}
        onSelect={onSelectPreset}
      />

      {/* 1. Name First */}
      <MobileInput
        label={t('drawers.quickExpense.incomeSourceDescription')}
        required
        value={name}
        onChangeText={(val) => {
          setName(val);
          if (nameError) setNameError('');
        }}
        placeholder={t('drawers.quickExpense.freelancePlaceholder')}
        error={nameError}
        autoFocus
      />

      {/* 2. Mandatory Receiving Bank Account Second */}
      <MobileBankPicker
        label={t('drawers.quickExpense.receivingAccount')}
        required
        displayStyle="field"
        compact={false}
        allowAllOption={false}
        placeholder={t('drawers.quickExpense.selectBankAccountPlaceholder')}
        banks={bankAccounts}
        selectedBankId={receivingAccountId}
        error={bankError}
        onSelectBank={(bId) => {
          setReceivingAccountId(bId);
          setBankError('');
        }}
      />

      {/* 3. Amount & Date */}
      <View style={styles.inputGroup}>
        <AmountInput
          label={t('drawers.quickExpense.amountAud')}
          required
          value={amount}
          onChangeText={(val) => {
            setAmount(val);
            if (amountError) setAmountError('');
          }}
          error={amountError}
          placeholder="0.00"
        />
      </View>

      <MobileDatePickerField
        label={t('drawers.quickExpense.dateLabel')}
        value={date}
        onChange={setDate}
        required
      />

      {/* Action Buttons: Split Income (primary) and Save Only (secondary) */}
      <View style={styles.btnRow}>
        <MobileButton variant="ghost" onPress={onCancel} style={styles.flexBtn}>
          {t('common.cancel')}
        </MobileButton>
        <MobileButton
          variant="secondary"
          onPress={() => handleValidateAndSubmit(false)}
          disabled={!isFormValid || isSubmitting}
          loading={isSubmitting}
          style={styles.flexBtn}
        >
          {t('common.saveOnly')}
        </MobileButton>
        <MobileButton
          variant="primary"
          onPress={() => handleValidateAndSubmit(true)}
          disabled={!isFormValid || isSubmitting}
          loading={isSubmitting}
          style={styles.flexBtn}
        >
          {t('common.splitIncome')}
        </MobileButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 16,
  },
  inputGroup: {
    gap: 6,
  },
  accountChips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  accountChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  accountChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  accountChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  accountChipTextSelected: {
    color: DESIGN_TOKENS.colors.sereneBlue,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  flexBtn: {
    flex: 1,
  },
});
