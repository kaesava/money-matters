import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatMobileCurrency } from '../../../lib/format';

interface MobileMatrixCellProps {
  readonly value: number;
  readonly projectedBalance?: number;
  readonly isSurplusTarget?: boolean;
}

export const MobileMatrixCell: React.FC<MobileMatrixCellProps> = ({
  value,
  projectedBalance,
  isSurplusTarget,
}) => {
  const isDeficit = Boolean(isSurplusTarget && value < 0);

  if (isSurplusTarget) {
    return (
      <View style={styles.cellContainer}>
        <View style={[styles.surplusPill, isDeficit ? styles.deficitPill : styles.surplusPositivePill]}>
          <Text style={[styles.pillText, isDeficit ? styles.deficitText : styles.surplusText]}>
            {isDeficit ? `-${formatMobileCurrency(Math.abs(value))}` : formatMobileCurrency(value)}
          </Text>
        </View>
        {projectedBalance !== undefined && (
          <Text style={styles.projectedText}>
            {t('matrix.balanceShort')}: {formatMobileCurrency(projectedBalance)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.cellContainer}>
      <Text style={styles.regularAmountText}>
        {formatMobileCurrency(value)}
      </Text>
      {projectedBalance !== undefined && (
        <Text style={styles.projectedText}>
          {t('matrix.balanceShort')}: {formatMobileCurrency(projectedBalance)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cellContainer: {
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 2,
  },
  surplusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  surplusPositivePill: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  deficitPill: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  surplusText: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  deficitText: {
    color: DESIGN_TOKENS.colors.burnRed,
  },
  regularAmountText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
  projectedText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.textMuted,
    fontWeight: '500',
  },
});
