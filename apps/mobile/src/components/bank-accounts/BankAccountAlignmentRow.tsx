import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD } from '../../lib/format';
import { t } from '@money-matters/i18n';

export interface BankAccountAlignmentRowProps {
  linkedPoolsCount: number;
  poolsTotal: number;
  diff: number;
  hasDiff: boolean;
  onPressAlign: () => void;
}

export function BankAccountAlignmentRow({
  linkedPoolsCount,
  poolsTotal,
  diff,
  hasDiff,
  onPressAlign,
}: BankAccountAlignmentRowProps) {
  if (linkedPoolsCount === 0) {
    return null;
  }

  if (!hasDiff) {
    return (
      <View style={styles.balancedRow}>
        <View style={styles.greenDot} />
        <Text style={styles.balancedText}>
          {t('bankAccounts.balancedStatus', { amount: formatAUD(poolsTotal) })}
        </Text>
      </View>
    );
  }

  const isSurplus = diff > 0;

  return (
    <View style={styles.diffRow}>
      <Text style={styles.expectedText}>
        {t('bankAccounts.expectedStatus', { amount: formatAUD(poolsTotal) })}
      </Text>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          onPressAlign();
        }}
        style={isSurplus ? styles.alignBtnSurplus : styles.alignBtnShortfall}
      >
        <View style={isSurplus ? styles.dotSurplus : styles.dotShortfall} />
        <Text style={isSurplus ? styles.alignBtnTextSurplus : styles.alignBtnTextShortfall}>
          {isSurplus
            ? t('bankAccounts.alignSurplus', { amount: formatAUD(diff) })
            : t('bankAccounts.alignShortfall', { amount: formatAUD(Math.abs(diff)) })}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  balancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DESIGN_TOKENS.colors.success,
  },
  balancedText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.successDark,
    fontWeight: '600',
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  expectedText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    fontWeight: '500',
  },
  alignBtnSurplus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  alignBtnShortfall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
  },
  dotSurplus: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DESIGN_TOKENS.colors.success,
  },
  dotShortfall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DESIGN_TOKENS.colors.critical,
  },
  alignBtnTextSurplus: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.successDark,
  },
  alignBtnTextShortfall: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.criticalDark,
  },
});
