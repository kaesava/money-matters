import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { HorizonBreakdownDTO } from '@money-matters/types';
import { DESIGN_TOKENS } from '../../tokens';
import { t } from '@money-matters/i18n';

interface MobileDonutChartProps {
  data: HorizonBreakdownDTO;
  formatCurrency: (amount: number) => string;
  isFiltered?: boolean;
  filteredSharePercentage?: number;
  centerLabel?: string;
  emptyText?: string;
}

export function MobileDonutChart({
  data,
  formatCurrency,
  isFiltered = false,
  filteredSharePercentage = 100,
  centerLabel,
  emptyText,
}: MobileDonutChartProps) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  if (data.totalOutflow <= 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {emptyText || t('transactions.reporting.donut.empty')}
        </Text>
      </View>
    );
  }

  if (isFiltered) {
    return (
      <FilteredMobileDonutView
        radius={radius}
        circumference={circumference}
        totalOutflow={data.totalOutflow}
        sharePercentage={filteredSharePercentage}
        formatCurrency={formatCurrency}
      />
    );
  }

  return (
    <MacroMobileDonutView
      radius={radius}
      circumference={circumference}
      data={data}
      formatCurrency={formatCurrency}
      centerLabel={centerLabel}
    />
  );
}

function FilteredMobileDonutView({
  radius,
  circumference,
  totalOutflow,
  sharePercentage,
  formatCurrency,
}: {
  radius: number;
  circumference: number;
  totalOutflow: number;
  sharePercentage: number;
  formatCurrency: (amount: number) => string;
}) {
  const pFiltered = Math.min(Math.max(sharePercentage / 100, 0), 1);
  const lenFiltered = circumference * pFiltered;

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width={150} height={150} viewBox="0 0 100 100">
          <G rotation="-90" origin="50, 50">
            <Circle
              cx="50"
              cy="50"
              r={radius}
              stroke={DESIGN_TOKENS.colors.slate[100]}
              strokeWidth="12"
              fill="transparent"
            />
            {lenFiltered > 0 && (
              <Circle
                cx="50"
                cy="50"
                r={radius}
                stroke={DESIGN_TOKENS.colors.sereneBlue}
                strokeWidth="12"
                strokeDasharray={`${lenFiltered} ${circumference}`}
                strokeDashoffset={0}
                fill="transparent"
              />
            )}
          </G>
        </Svg>
        <View style={styles.centerTextOverlay}>
          <Text style={styles.centerSubtitle}>{t('transactions.reporting.donut.thisFilter')}</Text>
          <Text style={styles.centerAmount}>{formatCurrency(totalOutflow)}</Text>
        </View>
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: DESIGN_TOKENS.colors.sereneBlue }]} />
          <Text style={styles.legendLabel}>{t('transactions.reporting.donut.thisFilter')}</Text>
          <Text style={styles.legendPct}>({sharePercentage}%)</Text>
        </View>
      </View>
    </View>
  );
}

function MacroMobileDonutView({
  radius,
  circumference,
  data,
  formatCurrency,
  centerLabel,
}: {
  radius: number;
  circumference: number;
  data: HorizonBreakdownDTO;
  formatCurrency: (amount: number) => string;
  centerLabel?: string;
}) {
  const pEveryday = data.percentages.everyday / 100;
  const pBills = data.percentages.bills / 100;
  const pGoals = data.percentages.goals / 100;

  const lenEveryday = circumference * pEveryday;
  const lenBills = circumference * pBills;
  const lenGoals = circumference * pGoals;

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width={150} height={150} viewBox="0 0 100 100">
          <G rotation="-90" origin="50, 50">
            <Circle
              cx="50"
              cy="50"
              r={radius}
              stroke={DESIGN_TOKENS.colors.slate[100]}
              strokeWidth="12"
              fill="transparent"
            />
            {lenEveryday > 0 && (
              <Circle
                cx="50"
                cy="50"
                r={radius}
                stroke={DESIGN_TOKENS.colors.sereneBlue}
                strokeWidth="12"
                strokeDasharray={`${lenEveryday} ${circumference}`}
                strokeDashoffset={0}
                fill="transparent"
              />
            )}
            {lenBills > 0 && (
              <Circle
                cx="50"
                cy="50"
                r={radius}
                stroke={DESIGN_TOKENS.colors.primary}
                strokeWidth="12"
                strokeDasharray={`${lenBills} ${circumference}`}
                strokeDashoffset={-lenEveryday}
                fill="transparent"
              />
            )}
            {lenGoals > 0 && (
              <Circle
                cx="50"
                cy="50"
                r={radius}
                stroke={DESIGN_TOKENS.colors.success}
                strokeWidth="12"
                strokeDasharray={`${lenGoals} ${circumference}`}
                strokeDashoffset={-(lenEveryday + lenBills)}
                fill="transparent"
              />
            )}
          </G>
        </Svg>
        <View style={styles.centerTextOverlay}>
          <Text style={styles.centerSubtitle}>
            {centerLabel || t('transactions.reporting.donut.totalOutflow')}
          </Text>
          <Text style={styles.centerAmount}>{formatCurrency(data.totalOutflow)}</Text>
        </View>
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: DESIGN_TOKENS.colors.sereneBlue }]} />
          <Text style={styles.legendLabel}>{t('transactions.reporting.donut.everyday')}</Text>
          <Text style={styles.legendPct}>({data.percentages.everyday}%)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: DESIGN_TOKENS.colors.primary }]} />
          <Text style={styles.legendLabel}>{t('transactions.reporting.donut.bills')}</Text>
          <Text style={styles.legendPct}>({data.percentages.bills}%)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: DESIGN_TOKENS.colors.success }]} />
          <Text style={styles.legendLabel}>{t('transactions.reporting.donut.goals')}</Text>
          <Text style={styles.legendPct}>({data.percentages.goals}%)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  chartWrapper: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerTextOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[400],
    textTransform: 'uppercase',
  },
  centerAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[800],
    marginTop: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  legendPct: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.slate[400],
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
