import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import {
  MobileModalDialog,
  MobileButton,
  MobileSearchSelect,
  MobileSearchSelectOption,
  DESIGN_TOKENS,
} from '@money-matters/ui/mobile';

interface SetupBalanceSweepModalProps {
  visible: boolean;
  activePool: { id: string; name: string; balance: number } | null;
  availablePools: Array<{ id: string; name: string; isSurplusTarget?: boolean | null }>;
  selectedDest: string;
  onSelectDest: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SetupBalanceSweepModal({
  visible,
  activePool,
  availablePools,
  selectedDest,
  onSelectDest,
  onConfirm,
  onCancel,
}: SetupBalanceSweepModalProps) {
  if (!activePool) return null;

  const validDests: MobileSearchSelectOption[] = availablePools
    .filter((p) => p.id !== activePool.id)
    .map((p) => ({
      value: p.id,
      label: `${p.name}${p.isSurplusTarget ? ' (Surplus Target)' : ''}`,
    }));

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onCancel}
      title={t('setup.sweepModalTitle')}
    >
      <View style={styles.container}>
        <Text style={styles.desc}>
          {t('setup.sweepModalDesc', {
            poolName: activePool.name,
            balance: `$${activePool.balance.toFixed(2)}`,
          })}
        </Text>

        <Text style={styles.label}>{t('setup.sweepDestinationLabel')}</Text>
        <MobileSearchSelect
          label=""
          options={validDests}
          value={selectedDest}
          onChange={(val: string) => onSelectDest(val)}
          placeholder={t('setup.sweepDestinationLabel')}
        />

        <View style={styles.btnRow}>
          <MobileButton
            variant="secondary"
            title={t('common.cancel')}
            onPress={onCancel}
            style={styles.btnFlex}
          />
          <MobileButton
            variant="primary"
            title={t('setup.sweepConfirmButton')}
            onPress={onConfirm}
            style={styles.btnFlex}
          />
        </View>
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    gap: 12,
  },
  desc: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[600],
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
    marginTop: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  btnFlex: {
    flex: 1,
  },
});
