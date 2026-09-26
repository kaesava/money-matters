import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import {
  DESIGN_TOKENS,
  AmountInput,
  MobileDatePickerField,
  MobileInput,
  FormLabel,
  MobileButton,
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
  bankAccounts: Array<{ id: string; name: string }>;
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

    if (!hasError) {
      onSubmit(splitImmediately);
    }
  };

  return (
    <View style={styles.container}>
      <QuickPresetsRow
        recentPresets={presets.recent}
        frequentPresets={presets.frequent}
        onSelect={onSelectPreset}
      />

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
          autoFocus
        />
      </View>

      <MobileDatePickerField
        label={t('drawers.quickExpense.dateLabel')}
        value={date}
        onChange={setDate}
        required
      />

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
      />

      {/* Optional Receiving Bank Account */}
      {bankAccounts.length > 0 && (
        <View style={styles.inputGroup}>
          <FormLabel>{t('drawers.quickExpense.bankAccountOptional')}</FormLabel>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountChips}
          >
            <TouchableOpacity
              onPress={() => setReceivingAccountId('')}
              style={[
                styles.accountChip,
                !receivingAccountId && styles.accountChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.accountChipText,
                  !receivingAccountId && styles.accountChipTextSelected,
                ]}
              >
                {t('drawers.quickExpense.defaultEverydayAccount')}
              </Text>
            </TouchableOpacity>

            {bankAccounts.map((acc) => {
              const isSelected = receivingAccountId === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  onPress={() => setReceivingAccountId(acc.id)}
                  style={[
                    styles.accountChip,
                    isSelected && styles.accountChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.accountChipText,
                      isSelected && styles.accountChipTextSelected,
                    ]}
                  >
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Action Buttons: Split Income (primary) and Save Only (secondary) */}
      <View style={styles.btnRow}>
        <MobileButton variant="ghost" onPress={onCancel} style={styles.flexBtn}>
          {t('common.cancel')}
        </MobileButton>
        <MobileButton
          variant="secondary"
          onPress={() => handleValidateAndSubmit(false)}
          loading={isSubmitting}
          style={styles.flexBtn}
        >
          {t('common.saveOnly')}
        </MobileButton>
        <MobileButton
          variant="primary"
          onPress={() => handleValidateAndSubmit(true)}
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
