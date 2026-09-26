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
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [destPickerVisible, setDestPickerVisible] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [sourceError, setSourceError] = useState('');
  const [destError, setDestError] = useState('');

  const isFutureDate = date > todayStr;
  const sourcePool = pools.find((p) => p.id === sourcePoolId);
  const destPool = pools.find((p) => p.id === destPoolId);

  const getPoolBal = (p?: { currentBalance?: number | string }) =>
    typeof p?.currentBalance === 'number'
      ? p.currentBalance
      : parseFloat((p?.currentBalance as string) || '0');

  const sourceBal = getPoolBal(sourcePool);
  const destBal = getPoolBal(destPool);

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
        required
        value={name}
        onChangeText={setName}
        placeholder={t('drawers.quickExpense.transferNamePlaceholder')}
      />

      {/* Source Pool Picker */}
      <View style={styles.inputGroup}>
        <FormLabel required>{t('drawers.quickExpense.fromPool')}</FormLabel>
        <TouchableOpacity
          onPress={() => setSourcePickerVisible(true)}
          style={[styles.pickerTrigger, !!sourceError && styles.pickerTriggerError]}
        >
          <View style={styles.pickerLeft}>
            <Text style={sourcePool ? styles.pickerValText : styles.pickerPlaceholderText}>
              {sourcePool ? sourcePool.name : t('drawers.quickExpense.selectSourcePoolPlaceholder')}
            </Text>
            {sourcePool && (
              <Text style={styles.pickerBalText}>({formatAUD(sourceBal)})</Text>
            )}
          </View>
          <Feather name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>
        <FormFieldError error={sourceError} />
      </View>

      {/* Destination Pool Picker */}
      <View style={styles.inputGroup}>
        <FormLabel required>{t('drawers.quickExpense.toPoolDestination')}</FormLabel>
        <TouchableOpacity
          onPress={() => setDestPickerVisible(true)}
          style={[styles.pickerTrigger, !!destError && styles.pickerTriggerError]}
        >
          <View style={styles.pickerLeft}>
            <Text style={destPool ? styles.pickerValText : styles.pickerPlaceholderText}>
              {destPool ? destPool.name : t('drawers.quickExpense.selectDestinationPoolPlaceholder')}
            </Text>
            {destPool && (
              <Text style={styles.pickerBalText}>({formatAUD(destBal)})</Text>
            )}
          </View>
          <Feather name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>
        <FormFieldError error={destError} />
      </View>

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

      <MobilePoolCategoryPickerSheet
        visible={sourcePickerVisible}
        onClose={() => setSourcePickerVisible(false)}
        pools={pools}
        selectedPoolId={sourcePoolId}
        allowSubcategories={false}
        title={t('drawers.quickExpense.selectSourcePoolPlaceholder')}
        onSelect={({ poolId }) => {
          setSourcePoolId(poolId);
          setSourceError('');
        }}
      />

      <MobilePoolCategoryPickerSheet
        visible={destPickerVisible}
        onClose={() => setDestPickerVisible(false)}
        pools={pools.filter((p) => p.id !== sourcePoolId)}
        selectedPoolId={destPoolId}
        allowSubcategories={false}
        title={t('drawers.quickExpense.selectDestinationPoolPlaceholder')}
        onSelect={({ poolId }) => {
          setDestPoolId(poolId);
          setDestError('');
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
