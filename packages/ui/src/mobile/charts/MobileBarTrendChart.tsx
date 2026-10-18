import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MonthlyCashFlowPointDTO } from '@money-matters/types';
import { DESIGN_TOKENS } from '../../tokens';
import { t } from '@money-matters/i18n';

interface MobileBarTrendChartProps {
  data: MonthlyCashFlowPointDTO[];
  formatCurrency: (amount: number) => string;
}

export function MobileBarTrendChart({ data, formatCurrency }: MobileBarTrendChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('transactions.reporting.cashFlow.empty')}</Text>
      </View>
    );
  }

  const recentData = data.slice(-4);
  const maxVal = Math.max(...recentData.map((d) => Math.max(d.income, d.outflow, 100)));

  return (
    <View style={styles.container}>
      <View style={styles.barsArea}>
        {recentData.map((point) => {
          const inPct = Math.round((point.income / maxVal) * 100);
          const outPct = Math.round((point.outflow / maxVal) * 100);

          return (
            <View key={point.monthKey} style={styles.col}>
              <View style={styles.barsGroup}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(inPct, 6)}%`,
                      backgroundColor: DESIGN_TOKENS.colors.success,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(outPct, 6)}%`,
                      backgroundColor: DESIGN_TOKENS.colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.monthLabel}>{point.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: DESIGN_TOKENS.colors.success }]} />
          <Text style={styles.legendText}>{t('transactions.reporting.cashFlow.inflow')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: DESIGN_TOKENS.colors.primary }]} />
          <Text style={styles.legendText}>{t('transactions.reporting.cashFlow.outflow')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  barsArea: {
    height: 130,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[100],
    paddingBottom: 4,
  },
  col: {
    alignItems: 'center',
    width: 60,
  },
  barsGroup: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  bar: {
    width: 14,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  monthLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[500],
    marginTop: 6,
    textTransform: 'uppercase',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  emptyContainer: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
  },
});
