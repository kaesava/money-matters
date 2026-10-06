import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../../lib/format';

interface ReconciliationMetricsProps {
  expectedTotal: number;
  availableToBudget: number;
  variance: number;
  absVariance: number;
  isSurplus: boolean;
}

export const ReconciliationMetrics: React.FC<ReconciliationMetricsProps> = ({
  expectedTotal,
  availableToBudget,
  variance,
  absVariance,
  isSurplus,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('bankAccounts.reconcile.expectedTotal')}</Text>
          <Text style={styles.metricVal}>{formatAUD(expectedTotal)}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('bankAccounts.reconcile.availableToBudget')}</Text>
          <Text style={styles.metricVal}>{formatAUD(availableToBudget)}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('bankAccounts.reconcile.difference')}</Text>
          <Text style={[styles.metricVal, isSurplus ? styles.textSurplus : styles.textShortfall]}>
            {isSurplus ? `+${formatAUD(variance)}` : `-${formatAUD(absVariance)}`}
          </Text>
        </View>
      </View>

      <View style={[styles.noticeCard, isSurplus ? styles.noticeSurplus : styles.noticeShortfall]}>
        <Text style={[styles.noticeText, isSurplus ? styles.noticeTextSurplus : styles.noticeTextShortfall]}>
          {isSurplus
            ? t('bankAccounts.reconcile.surplusNotice', { amount: formatAUD(absVariance) })
            : t('bankAccounts.reconcile.shortfallNotice', { amount: formatAUD(absVariance) })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 10,
    gap: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
    textTransform: 'uppercase',
  },
  metricVal: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
  textSurplus: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  textShortfall: {
    color: DESIGN_TOKENS.colors.warningDark,
  },
  noticeCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noticeSurplus: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  noticeShortfall: {
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  noticeTextSurplus: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  noticeTextShortfall: {
    color: DESIGN_TOKENS.colors.warningDark,
  },
});
