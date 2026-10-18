import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../lib/format';

interface MobilePaydayMetricsGridProps {
  everydayAllocated: number;
  billsAllocated: number;
  goalsAllocated: number;
  safeToSpend: number;
  isDeficit: boolean;
}

export function MobilePaydayMetricsGrid({
  everydayAllocated,
  billsAllocated,
  goalsAllocated,
  safeToSpend,
  isDeficit,
}: MobilePaydayMetricsGridProps) {
  return (
    <View style={styles.metricsGrid}>
      <View style={styles.metricItem}>
        <Text style={styles.metricLabel}>{t('paydayDrawer.everydaySpending')}</Text>
        <Text style={styles.metricValue}>{formatAUD(everydayAllocated)}</Text>
      </View>
      <View style={styles.metricItem}>
        <Text style={styles.metricLabel}>{t('paydayDrawer.ringFencedBills')}</Text>
        <Text style={styles.metricValue}>{formatAUD(billsAllocated)}</Text>
      </View>
      <View style={styles.metricItem}>
        <Text style={styles.metricLabel}>{t('paydayDrawer.fundedGoals')}</Text>
        <Text style={styles.metricValue}>{formatAUD(goalsAllocated)}</Text>
      </View>
      <View style={[styles.metricItem, isDeficit ? styles.metricDeficitHighlight : styles.metricHighlight]}>
        <Text style={isDeficit ? styles.metricDeficitHighlightLabel : styles.metricHighlightLabel}>
          {isDeficit ? t('paydayDrawer.metricDeficit') : t('paydayDrawer.metricSurplus')}
        </Text>
        <Text style={isDeficit ? styles.metricDeficitHighlightValue : styles.metricHighlightValue}>
          {formatAUD(safeToSpend)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricItem: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  metricHighlight: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  metricDeficitHighlight: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  metricHighlightLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#86EFAC',
    textAlign: 'center',
  },
  metricHighlightValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#4ADE80',
    fontFamily: 'monospace',
  },
  metricDeficitHighlightLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FDA4AF',
    textAlign: 'center',
  },
  metricDeficitHighlightValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FB7185',
    fontFamily: 'monospace',
  },
});
