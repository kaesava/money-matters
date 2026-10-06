import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  MobileDatePickerField,
  AmountInput,
  MobileInput,
  MobilePoolPicker,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import type { PoolOption } from '../MobileTransferModal';

interface TransferFormFieldsProps {
  name: string;
  setName: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  expectedDate: string;
  setExpectedDate: (v: string) => void;
  sourcePoolId: string;
  setSourcePoolId: (id: string) => void;
  destinationPoolId: string;
  setDestinationPoolId: (id: string) => void;
  pools: PoolOption[];
  onFieldChange: () => void;
}

export const TransferFormFields: React.FC<TransferFormFieldsProps> = ({
  name,
  setName,
  amount,
  setAmount,
  expectedDate,
  setExpectedDate,
  sourcePoolId,
  setSourcePoolId,
  destinationPoolId,
  setDestinationPoolId,
  pools,
  onFieldChange,
}) => {
  const formattedPools = pools.map((p) => ({
    id: p.id,
    name: p.name,
    poolType: p.poolType,
    currentBalance: p.currentBalance ?? undefined,
    isPrivate: p.isPrivate,
  }));

  return (
    <View style={styles.container}>
      <MobileInput
        label={t('common.name')}
        required
        value={name}
        onChangeText={(v) => {
          setName(v);
          onFieldChange();
        }}
        placeholder={t('common.transfer')}
      />

      <AmountInput
        label={t('common.amount')}
        required
        value={amount}
        onChangeText={(v) => {
          setAmount(v);
          onFieldChange();
        }}
      />

      <MobileDatePickerField
        label={t('common.date')}
        required
        value={expectedDate}
        onChange={(v) => {
          setExpectedDate(v);
          onFieldChange();
        }}
      />

      <MobilePoolPicker
        label={t('drawers.quickExpense.fromPool')}
        required
        displayStyle="field"
        mode="inline"
        pools={formattedPools}
        selectedPoolId={sourcePoolId}
        allowCategorySelection={false}
        placeholder={t('common.selectPool')}
        onSelectPool={(pId) => {
          setSourcePoolId(pId);
          onFieldChange();
        }}
      />

      <MobilePoolPicker
        label={t('drawers.quickExpense.toPoolDestination')}
        required
        displayStyle="field"
        mode="inline"
        pools={formattedPools}
        selectedPoolId={destinationPoolId}
        allowCategorySelection={false}
        placeholder={t('common.selectPool')}
        onSelectPool={(pId) => {
          setDestinationPoolId(pId);
          onFieldChange();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
});
