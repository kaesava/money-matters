import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  AmountInput,
  MobileDatePickerField,
  MobileInput,
  FormLabel,
  FormFieldError,
  MobileButton,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../lib/format';
import { QuickPresetItem } from './useMobileQuickAction';
import { QuickPresetsRow } from './QuickPresetsRow';
import { MobilePoolCategoryPickerSheet } from './MobilePoolCategoryPickerSheet';

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
  const [pickerVisible, setPickerVisible] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [nameError, setNameError] = useState('');
  const [poolError, setPoolError] = useState('');

  const isFutureDate = date > todayStr;
  const selectedPool = pools.find((p) => p.id === selectedPoolId);
  const selectedSubCat = categories.find((c) => c.id === selectedSubCategoryId);

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
      <View style={styles.inputGroup}>
        <FormLabel required>{t('drawers.quickExpense.category')}</FormLabel>
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={[styles.pickerTrigger, !!poolError && styles.pickerTriggerError]}
        >
          <View style={styles.pickerLeft}>
            <Text style={selectedPool ? styles.pickerValText : styles.pickerPlaceholderText}>
              {selectedSubCat
                ? `${selectedPool?.name} ➔ ${selectedSubCat.name}`
                : selectedPool
                ? selectedPool.name
                : t('drawers.quickExpense.selectPoolOrCategoryPlaceholder')}
            </Text>
            {selectedPool && (
              <Text style={styles.pickerBalText}>({formatAUD(poolBal)})</Text>
            )}
          </View>
          <Feather name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>
        <FormFieldError error={poolError} />
      </View>

      <MobilePoolCategoryPickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        pools={enrichedPools}
        selectedPoolId={selectedPoolId}
        selectedSubCategoryId={selectedSubCategoryId}
        onSelect={({ poolId, subCategoryId }) => {
          setSelectedPoolId(poolId);
          setSelectedSubCategoryId(subCategoryId || null);
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
  pickerTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  pickerTriggerError: {
    borderColor: DESIGN_TOKENS.colors.critical,
  },
  pickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pickerValText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  pickerPlaceholderText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  pickerBalText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#64748B',
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
