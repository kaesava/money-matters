import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  AmountInput,
  MobileDatePickerField,
  MobileInput,
  MobileButton,
  MobilePoolPicker,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { QuickPresetItem } from './useMobileQuickAction';
import { QuickPresetsRow } from './QuickPresetsRow';

export interface QuickTransferTabProps {
  name: string;
  setName: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  todayStr: string;
  sourcePoolId: string;
  setSourcePoolId: (v: string) => void;
  destPoolId: string;
  setDestPoolId: (v: string) => void;
  pools: Array<{
    id: string;
    name: string;
    poolType: string;
    currentBalance?: number | string;
  }>;
  presets: { recent: QuickPresetItem[]; frequent: QuickPresetItem[] };
  onSelectPreset: (preset: QuickPresetItem) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function QuickTransferTab({
  name,
  setName,
  amount,
  setAmount,
  date,
  setDate,
  todayStr,
  sourcePoolId,
  setSourcePoolId,
  destPoolId,
  setDestPoolId,
  pools,
  presets,
  onSelectPreset,
  isSubmitting,
  onSubmit,
  onCancel,
}: QuickTransferTabProps) {
  const [amountError, setAmountError] = useState('');
  const [sourceError, setSourceError] = useState('');
  const [destError, setDestError] = useState('');
  const [dateError, setDateError] = useState('');

  const isFutureDate = date > todayStr;

  const handleValidateAndSubmit = () => {
    let hasError = false;
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setAmountError(t('drawers.quickExpense.validAmountError'));
      hasError = true;
    } else {
      setAmountError('');
    }

    if (!sourcePoolId) {
      setSourceError(t('drawers.quickExpense.poolsRequired'));
      hasError = true;
    } else {
      setSourceError('');
    }

    if (!destPoolId) {
      setDestError(t('drawers.quickExpense.poolsRequired'));
      hasError = true;
    } else if (sourcePoolId === destPoolId) {
      setDestError(t('drawers.quickExpense.poolsDifferent'));
      hasError = true;
    } else {
      setDestError('');
    }

    if (date < todayStr) {
      setDateError('Transfers cannot be backdated into the past.');
      hasError = true;
    } else {
      setDateError('');
    }

    if (!hasError) {
      onSubmit();
    }
  };

  return (
    <View style={styles.container}>
      <QuickPresetsRow
        recentPresets={presets.recent}
        frequentPresets={presets.frequent}
        onSelect={onSelectPreset}
      />

      {/* Transfer Name */}
      <MobileInput
        label={t('drawers.quickExpense.transferName')}
        value={name}
        onChangeText={setName}
        placeholder={t('drawers.quickExpense.transferNamePlaceholder')}
      />

      {/* Source Pool Picker */}
      <MobilePoolPicker
        label={t('drawers.quickExpense.fromPool')}
        required
        displayStyle="field"
        mode="inline"
        allowCategorySelection={false}
        allowAllOption={false}
        pools={pools}
        selectedPoolId={sourcePoolId}
        placeholder={t('drawers.quickExpense.selectSourcePoolPlaceholder')}
        error={sourceError}
        onSelectPool={(pId) => {
          setSourcePoolId(pId);
          setSourceError('');
        }}
      />

      {/* Destination Pool Picker */}
      <MobilePoolPicker
        label={t('drawers.quickExpense.toPoolDestination')}
        required
        displayStyle="field"
        mode="inline"
        allowCategorySelection={false}
        allowAllOption={false}
        pools={pools.filter((p) => p.id !== sourcePoolId)}
        selectedPoolId={destPoolId}
        placeholder={t('drawers.quickExpense.selectDestinationPoolPlaceholder')}
        error={destError}
        onSelectPool={(pId) => {
          setDestPoolId(pId);
          setDestError('');
        }}
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
        />
      </View>

      <MobileDatePickerField
        label={t('drawers.quickExpense.dateLabel')}
        value={date}
        onChange={(val) => {
          setDate(val);
          if (dateError) setDateError('');
        }}
        required
        error={dateError}
      />

      {/* Footer Buttons */}
      <View style={styles.btnRow}>
        <MobileButton variant="ghost" onPress={onCancel} style={styles.flexBtn}>
          {t('common.cancel')}
        </MobileButton>
        <MobileButton
          variant="primary"
          onPress={handleValidateAndSubmit}
          loading={isSubmitting}
          style={styles.flexBtn}
        >
          {isFutureDate ? t('common.saveOnly') : t('common.transfer')}
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
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  flexBtn: {
    flex: 1,
  },
});
