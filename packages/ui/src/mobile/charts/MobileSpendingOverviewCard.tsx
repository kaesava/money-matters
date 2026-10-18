import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SpendingAnalyticsDTO, SpendingTimeframe } from '@money-matters/types';
import { MobileDonutChart } from './MobileDonutChart';
import { MobileBarTrendChart } from './MobileBarTrendChart';
import { MobileHorizontalRankedBarChart } from './MobileHorizontalRankedBarChart';
import { DESIGN_TOKENS } from '../../tokens';
import { t } from '@money-matters/i18n';
import {
  ChartTab,
  MobileSpendingOverviewLabels,
  CardHeader,
  TimeframePills,
  TabSwitcher,
} from './MobileSpendingOverviewControls';

export type { MobileSpendingOverviewLabels };

interface MobileSpendingOverviewCardProps {
  analytics: SpendingAnalyticsDTO | undefined;
  isLoading: boolean;
  timeframe: SpendingTimeframe;
  onTimeframeChange: (timeframe: SpendingTimeframe) => void;
  formatCurrency: (amount: number) => string;
  labels?: MobileSpendingOverviewLabels;
  showPayeesWhenFiltered?: boolean;
}

export function MobileSpendingOverviewCard({
  analytics,
  isLoading,
  timeframe,
  onTimeframeChange,
  formatCurrency,
  labels,
  showPayeesWhenFiltered = true,
}: MobileSpendingOverviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<ChartTab>('HORIZON');
  const isFiltered = Boolean(analytics?.isFiltered);

  const timeframes: Array<{ key: SpendingTimeframe; label: string }> = [
    { key: '30D', label: t('transactions.reporting.timeframe.d30') },
    { key: '90D', label: t('transactions.reporting.timeframe.d90') },
    { key: '1Y', label: t('transactions.reporting.timeframe.y1') },
  ];

  return (
    <View style={styles.card}>
      <CardHeader
        isFiltered={isFiltered}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        labels={labels}
      />

      {isExpanded && (
        <View style={styles.content}>
          <TimeframePills
            timeframes={timeframes}
            timeframe={timeframe}
            onSelect={onTimeframeChange}
          />

          <TabSwitcher
            isFiltered={isFiltered}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            labels={labels}
          />

          <ChartContent
            activeTab={activeTab}
            analytics={analytics}
            isLoading={isLoading}
            isFiltered={isFiltered}
            formatCurrency={formatCurrency}
            labels={labels}
            showPayeesWhenFiltered={showPayeesWhenFiltered}
          />
        </View>
      )}
    </View>
  );
}

function ChartContent({
  activeTab,
  analytics,
  isLoading,
  isFiltered,
  formatCurrency,
  labels,
  showPayeesWhenFiltered,
}: {
  activeTab: ChartTab;
  analytics: SpendingAnalyticsDTO | undefined;
  isLoading: boolean;
  isFiltered: boolean;
  formatCurrency: (amount: number) => string;
  labels?: MobileSpendingOverviewLabels;
  showPayeesWhenFiltered?: boolean;
}) {
  if (isLoading) {
    return (
      <View style={styles.centerArea}>
        <Text style={styles.mutedText}>{t('common.loading')}</Text>
      </View>
    );
  }
  if (analytics?.isTransferOnly) {
    return (
      <View style={styles.noticeArea}>
        <Text style={styles.noticeText}>{t('transactions.reporting.transfersNotice')}</Text>
      </View>
    );
  }
  if (!analytics || analytics.isEmpty) {
    return (
      <View style={styles.centerArea}>
        <Text style={styles.mutedText}>
          {labels?.emptyText || t('transactions.reporting.donut.empty')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.chartArea}>
      {activeTab === 'HORIZON' && (
        <MobileDonutChart
          data={analytics.horizonBreakdown}
          formatCurrency={formatCurrency}
          isFiltered={isFiltered}
          filteredSharePercentage={analytics.filteredSharePercentage}
          centerLabel={labels?.centerLabel}
          emptyText={labels?.emptyText}
        />
      )}
      {activeTab === 'CASH_FLOW' && (
        <MobileBarTrendChart
          data={analytics.monthlyCashFlow}
          formatCurrency={formatCurrency}
          isFiltered={isFiltered}
          inflowLabel={labels?.inflowLegend}
          outflowLabel={labels?.outflowLegend}
          emptyText={labels?.emptyText}
        />
      )}
      {activeTab === 'TOP_POOLS' && (
        <MobileHorizontalRankedBarChart
          topPools={analytics.topPools}
          otherPoolsAmount={analytics.otherPoolsAmount}
          totalOutflow={analytics.totalOutflow}
          formatCurrency={formatCurrency}
          isFiltered={isFiltered}
          topPayees={analytics.topPayees}
          showPayeesWhenFiltered={showPayeesWhenFiltered}
          emptyText={labels?.emptyText}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    marginBottom: 12,
    overflow: 'hidden',
  },
  content: {
    padding: 12,
  },
  chartArea: {
    marginTop: 4,
  },
  centerArea: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
  },
  noticeArea: {
    padding: 16,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 8,
    marginTop: 8,
  },
  noticeText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[600],
    textAlign: 'center',
  },
});
