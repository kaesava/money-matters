import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../../lib/format';

interface ReconciliationValidationFooterProps {
  sumAdjustments: number;
  absVariance: number;
  isSumValid: boolean;
  onOpenTransfer?: () => void;
}

export const ReconciliationValidationFooter: React.FC<ReconciliationValidationFooterProps> = ({
  sumAdjustments,
  absVariance,
  isSumValid,
  onOpenTransfer,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.validationRow}>
        <Text style={styles.validationLabel}>
          {t('bankAccounts.reconcile.allocatedSplitTotal')}
        </Text>
        <View style={styles.validationRight}>
          <Text style={[styles.validationAmount, isSumValid ? styles.textSurplus : styles.textShortfall]}>
            {formatAUD(sumAdjustments)} / {formatAUD(absVariance)}
          </Text>
          <Text style={[styles.validationBadge, isSumValid ? styles.textSurplus : styles.textShortfall]}>
            {isSumValid
              ? t('bankAccounts.reconcile.matches')
              : t('bankAccounts.reconcile.remaining', { amount: formatAUD(Math.abs(absVariance - sumAdjustments)) })}
          </Text>
        </View>
      </View>

      {onOpenTransfer && (
        <TouchableOpacity onPress={onOpenTransfer} style={styles.transferLinkBtn}>
          <Text style={styles.transferLinkText}>
            {t('bankAccounts.reconcile.transferBetweenPoolsLink')}
          </Text>
          <Feather name="arrow-right" size={14} color={DESIGN_TOKENS.colors.accent} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  validationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
    paddingTop: 10,
  },
  validationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  validationRight: {
    alignItems: 'flex-end',
  },
  validationAmount: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  validationBadge: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  textSurplus: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  textShortfall: {
    color: DESIGN_TOKENS.colors.warningDark,
  },
  transferLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingVertical: 4,
  },
  transferLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
});
