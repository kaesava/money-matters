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
import { formatAUD } from '../../lib/format';
import { QuickPresetItem } from './useMobileQuickAction';
import { QuickPresetsRow } from './QuickPresetsRow';

export interface QuickExpenseTabProps {
  name: string;
  setName: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  todayStr: string;
  selectedPoolId: string;
  setSelectedPoolId: (v: string) => void;
  selectedSubCategoryId: string | null;
  setSelectedSubCategoryId: (v: string | null) => void;
  pools: Array<{
    id: string;
    name: string;
    poolType: string;
    currentBalance?: number | string;
  }>;
  categories: Array<{ id: string; name: string; poolId: string }>;
  presets: { recent: QuickPresetItem[]; frequent: QuickPresetItem[] };
  onSelectPreset: (preset: QuickPresetItem) => void;
  isSubmitting: boolean;
  onSubmit: (skipBalanceCheck?: boolean) => void;
  onCancel: () => void;
}

export function QuickExpenseTab({
  name,
  setName,
  amount,
  setAmount,
  date,
  setDate,
  todayStr,
  selectedPoolId,
  setSelectedPoolId,
  selectedSubCategoryId,
  setSelectedSubCategoryId,
  pools,
  categories,
  presets,
  onSelectPreset,
  isSubmitting,
  onSubmit,
  onCancel,
}: QuickExpenseTabProps) {
  const [amountError, setAmountError] = useState('');
  const [nameError, setNameError] = useState('');
  const [poolError, setPoolError] = useState('');

  const isFutureDate = date > todayStr;
  const selectedPool = pools.find((p) => p.id === selectedPoolId);

  const getPoolBal = (p?: { currentBalance?: number | string }) =>
    typeof p?.currentBalance === 'number'
      ? p.currentBalance
      : parseFloat((p?.currentBalance as string) || '0');

  const poolBal = getPoolBal(selectedPool);
  const isOverdraft = !isFutureDate && selectedPool && parseFloat(amount || '0') > poolBal;

  const enrichedPools = pools.map((p) => ({
    ...p,
    categories: categories.filter((c) => c.poolId === p.id),
  }));

  const handleValidateAndSubmit = () => {
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

    if (!selectedPoolId) {
      setPoolError(t('drawers.quickExpense.poolSelectionRequired'));
      hasError = true;
    } else {
      setPoolError('');
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
        {isOverdraft && (
          <Text style={styles.overdraftWarning}>
            ⚠️ Exceeds pool balance ({formatAUD(poolBal)})
          </Text>
        )}
      </View>

      <MobileDatePickerField
        label={t('drawers.quickExpense.dateLabel')}
        value={date}
        onChange={setDate}
        required
      />

      <MobileInput
        label={t('drawers.quickExpense.expenseNameMerchant')}
        required
        value={name}
        onChangeText={(val) => {
          setName(val);
          if (nameError) setNameError('');
        }}
        placeholder={t('drawers.quickExpense.woolworthsPlaceholder')}
        error={nameError}
      />

      {/* Pool / Category Selection */}
      <MobilePoolPicker
        label={t('drawers.quickExpense.category')}
        required
        displayStyle="field"
        mode="inline"
        allowCategorySelection={true}
        allowAllOption={false}
        pools={enrichedPools}
        selectedPoolId={selectedPoolId}
        selectedCategoryId={selectedSubCategoryId}
        placeholder={t('drawers.quickExpense.selectPoolOrCategoryPlaceholder')}
        error={poolError}
        onSelectCategory={(poolId, catId) => {
          setSelectedPoolId(poolId);
          setSelectedSubCategoryId(catId);
          setPoolError('');
        }}
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
          {isFutureDate ? t('common.saveOnly') : t('common.markSpent')}
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
  overdraftWarning: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.critical,
    fontWeight: '600',
    marginTop: 2,
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
