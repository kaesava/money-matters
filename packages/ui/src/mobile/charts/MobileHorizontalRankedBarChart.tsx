import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TopOutflowPoolDTO, TopPayeeItemDTO } from '@money-matters/types';
import { DESIGN_TOKENS } from '../../tokens';
import { t } from '@money-matters/i18n';

interface MobileHorizontalRankedBarChartProps {
  topPools: TopOutflowPoolDTO[];
  otherPoolsAmount: number;
  totalOutflow: number;
  formatCurrency: (amount: number) => string;
  isFiltered?: boolean;
  topPayees?: TopPayeeItemDTO[];
}

export function MobileHorizontalRankedBarChart({
  topPools,
  otherPoolsAmount,
  totalOutflow,
  formatCurrency,
  isFiltered = false,
  topPayees = [],
}: MobileHorizontalRankedBarChartProps) {
  if (isFiltered) {
    return (
      <FilteredMobilePayeesView
        payees={topPayees}
        totalOutflow={totalOutflow}
        formatCurrency={formatCurrency}
      />
    );
  }

  return (
    <MacroMobilePoolsView
      topPools={topPools}
      otherPoolsAmount={otherPoolsAmount}
      totalOutflow={totalOutflow}
      formatCurrency={formatCurrency}
    />
  );
}

function FilteredMobilePayeesView({
  payees,
  totalOutflow,
  formatCurrency,
}: {
  payees: TopPayeeItemDTO[];
  totalOutflow: number;
  formatCurrency: (amount: number) => string;
}) {
  if (payees.length === 0 || totalOutflow <= 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('transactions.reporting.topPools.emptyPayees')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {payees.slice(0, 5).map((payee, idx) => (
        <View key={payee.name || idx} style={styles.row}>
          <View style={styles.labelRow}>
            <Text style={styles.poolName} numberOfLines={1}>
              {payee.name}
            </Text>
            <View style={styles.amtGroup}>
              <Text style={styles.amount}>{formatCurrency(payee.amount)}</Text>
              <Text style={styles.pct}>({payee.percentage}%)</Text>
            </View>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(Math.max(payee.percentage, 4), 100)}%`,
                  backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function MacroMobilePoolsView({
  topPools,
  otherPoolsAmount,
  totalOutflow,
  formatCurrency,
}: {
  topPools: TopOutflowPoolDTO[];
  otherPoolsAmount: number;
  totalOutflow: number;
  formatCurrency: (amount: number) => string;
}) {
  if (topPools.length === 0 || totalOutflow <= 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('transactions.reporting.topPools.empty')}</Text>
      </View>
    );
  }

  const otherPercentage =
    totalOutflow > 0 ? Math.round((otherPoolsAmount / totalOutflow) * 10000) / 100 : 0;

  return (
    <View style={styles.container}>
      {topPools.slice(0, 4).map((pool, idx) => (
        <View key={pool.id || idx} style={styles.row}>
          <View style={styles.labelRow}>
            <Text style={styles.poolName} numberOfLines={1}>
              {pool.name}
            </Text>
            <View style={styles.amtGroup}>
              <Text style={styles.amount}>{formatCurrency(pool.amount)}</Text>
              <Text style={styles.pct}>({pool.percentage}%)</Text>
            </View>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(Math.max(pool.percentage, 4), 100)}%`,
                  backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
                },
              ]}
            />
          </View>
        </View>
      ))}

      {otherPoolsAmount > 0 && (
        <View style={[styles.row, styles.otherRow]}>
          <View style={styles.labelRow}>
            <Text style={styles.otherName} numberOfLines={1}>
              {t('transactions.reporting.topPools.otherPools')}
            </Text>
            <View style={styles.amtGroup}>
              <Text style={styles.otherAmount}>{formatCurrency(otherPoolsAmount)}</Text>
              <Text style={styles.pct}>({otherPercentage}%)</Text>
            </View>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(Math.max(otherPercentage, 4), 100)}%`,
                  backgroundColor: DESIGN_TOKENS.colors.slate[400],
                },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    gap: 10,
  },
  row: {
    gap: 4,
  },
  otherRow: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  poolName: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[700],
    maxWidth: 160,
  },
  otherName: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[500],
    maxWidth: 160,
  },
  amtGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amount: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  otherAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  pct: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.slate[400],
  },
  track: {
    height: 7,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
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
