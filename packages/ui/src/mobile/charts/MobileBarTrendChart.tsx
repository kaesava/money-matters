import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MonthlyCashFlowPointDTO } from '@money-matters/types';
import { DESIGN_TOKENS } from '../../tokens';
import { t } from '@money-matters/i18n';

interface MobileBarTrendChartProps {
  data: MonthlyCashFlowPointDTO[];
  formatCurrency: (amount: number) => string;
  isFiltered?: boolean;
  inflowLabel?: string;
  outflowLabel?: string;
  emptyText?: string;
}

export function MobileBarTrendChart({
  data,
  isFiltered = false,
  inflowLabel,
  outflowLabel,
  emptyText,
}: MobileBarTrendChartProps) {
  const scrollRef = useRef<ScrollView>(null);

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {emptyText || t('transactions.reporting.cashFlow.empty')}
        </Text>
      </View>
    );
  }

  const maxVal = Math.max(
    ...data.map((d) => (isFiltered ? d.outflow : Math.max(d.income, d.outflow, 50))),
    50
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={() => {
          if (data.length > 4) {
            scrollRef.current?.scrollToEnd({ animated: false });
          }
        }}
      >
        <View style={styles.barsArea}>
          {data.map((point) => (
            <MobileBarPointItem
              key={point.monthKey}
              point={point}
              maxVal={maxVal}
              isFiltered={isFiltered}
            />
          ))}
        </View>
      </ScrollView>

      <MobileChartLegend
        isFiltered={isFiltered}
        inflowLabel={inflowLabel}
        outflowLabel={outflowLabel}
      />
    </View>
  );
}

function MobileBarPointItem({
  point,
  maxVal,
  isFiltered,
}: {
  point: MonthlyCashFlowPointDTO;
  maxVal: number;
  isFiltered: boolean;
}) {
  const inPct = Math.round((point.income / maxVal) * 100);
  const outPct = Math.round((point.outflow / maxVal) * 100);

  return (
    <View style={styles.col}>
      <View style={styles.barsGroup}>
        {!isFiltered && (
          <View
            style={[
              styles.bar,
              {
                height: `${Math.max(inPct, 6)}%`,
                backgroundColor: DESIGN_TOKENS.colors.success,
              },
            ]}
          />
        )}
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
}

function MobileChartLegend({
  isFiltered,
  inflowLabel,
  outflowLabel,
}: {
  isFiltered: boolean;
  inflowLabel?: string;
  outflowLabel?: string;
}) {
  if (isFiltered) {
    return (
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: DESIGN_TOKENS.colors.primary }]} />
          <Text style={styles.legendText}>{t('transactions.reporting.donut.thisFilter')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.dot, { backgroundColor: DESIGN_TOKENS.colors.success }]} />
        <Text style={styles.legendText}>{inflowLabel || t('transactions.reporting.cashFlow.inflow')}</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.dot, { backgroundColor: DESIGN_TOKENS.colors.primary }]} />
        <Text style={styles.legendText}>{outflowLabel || t('transactions.reporting.cashFlow.outflow')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  barsArea: {
    height: 130,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[100],
    paddingBottom: 4,
    gap: 8,
    paddingHorizontal: 8,
  },
  col: {
    alignItems: 'center',
    width: 44,
  },
  barsGroup: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    width: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  monthLabel: {
    fontSize: 9,
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
