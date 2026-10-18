import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SpendingAnalyticsDTO, SpendingTimeframe } from '@money-matters/types';
import { MobileDonutChart } from './MobileDonutChart';
import { MobileBarTrendChart } from './MobileBarTrendChart';
import { MobileHorizontalRankedBarChart } from './MobileHorizontalRankedBarChart';
import { DESIGN_TOKENS } from '../../tokens';
import { t } from '@money-matters/i18n';

type ChartTab = 'HORIZON' | 'CASH_FLOW' | 'TOP_POOLS';

interface MobileSpendingOverviewCardProps {
  analytics: SpendingAnalyticsDTO | undefined;
  isLoading: boolean;
  timeframe: SpendingTimeframe;
  onTimeframeChange: (timeframe: SpendingTimeframe) => void;
  formatCurrency: (amount: number) => string;
}

export function MobileSpendingOverviewCard({
  analytics,
  isLoading,
  timeframe,
  onTimeframeChange,
  formatCurrency,
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
          />

          <ChartContent
            activeTab={activeTab}
            analytics={analytics}
            isLoading={isLoading}
            isFiltered={isFiltered}
            formatCurrency={formatCurrency}
          />
        </View>
      )}
    </View>
  );
}

function CardHeader({
  isFiltered,
  isExpanded,
  onToggle,
}: {
  isFiltered: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.titleArea}>
        <View style={styles.iconBox}>
          <Feather name="pie-chart" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
        </View>
        <View>
          <Text style={styles.title}>
            {isFiltered
              ? t('transactions.reporting.filteredOverviewTitle')
              : t('transactions.reporting.overviewTitle')}
          </Text>
          <Text style={styles.subtitle}>
            {isFiltered
              ? t('transactions.reporting.filteredOverviewSubtitle')
              : t('transactions.reporting.overviewSubtitle')}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={onToggle} style={styles.collapseBtn} activeOpacity={0.7}>
        <Feather
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={DESIGN_TOKENS.colors.slate[500]}
        />
      </TouchableOpacity>
    </View>
  );
}

function TimeframePills({
  timeframes,
  timeframe,
  onSelect,
}: {
  timeframes: Array<{ key: SpendingTimeframe; label: string }>;
  timeframe: SpendingTimeframe;
  onSelect: (tf: SpendingTimeframe) => void;
}) {
  return (
    <View style={styles.timeframePills}>
      {timeframes.map((tf) => (
        <TouchableOpacity
          key={tf.key}
          onPress={() => onSelect(tf.key)}
          style={[styles.tfButton, timeframe === tf.key && styles.tfButtonActive]}
          activeOpacity={0.7}
        >
          <Text style={[styles.tfText, timeframe === tf.key && styles.tfTextActive]}>
            {tf.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function TabSwitcher({
  isFiltered,
  activeTab,
  onSelectTab,
}: {
  isFiltered: boolean;
  activeTab: ChartTab;
  onSelectTab: (tab: ChartTab) => void;
}) {
  const tabs: Array<{ key: ChartTab; label: string }> = [
    {
      key: 'HORIZON',
      label: isFiltered
        ? t('transactions.reporting.donut.filteredTitle')
        : t('transactions.reporting.tabs.horizon'),
    },
    {
      key: 'CASH_FLOW',
      label: isFiltered
        ? t('transactions.reporting.cashFlow.filteredTitle')
        : t('transactions.reporting.tabs.cashFlow'),
    },
    {
      key: 'TOP_POOLS',
      label: isFiltered
        ? t('transactions.reporting.topPools.filteredTitle')
        : t('transactions.reporting.tabs.topPools'),
    },
  ];

  return (
    <View style={styles.tabSwitcher}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onSelectTab(tab.key)}
          style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ChartContent({
  activeTab,
  analytics,
  isLoading,
  isFiltered,
  formatCurrency,
}: {
  activeTab: ChartTab;
  analytics: SpendingAnalyticsDTO | undefined;
  isLoading: boolean;
  isFiltered: boolean;
  formatCurrency: (amount: number) => string;
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
        <Text style={styles.mutedText}>{t('transactions.reporting.donut.empty')}</Text>
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
        />
      )}
      {activeTab === 'CASH_FLOW' && (
        <MobileBarTrendChart
          data={analytics.monthlyCashFlow}
          formatCurrency={formatCurrency}
          isFiltered={isFiltered}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[100],
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  subtitle: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.slate[500],
    marginTop: 1,
  },
  collapseBtn: {
    padding: 4,
  },
  content: {
    padding: 12,
  },
  timeframePills: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 8,
    padding: 2,
    marginBottom: 10,
  },
  tfButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tfButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  tfText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[500],
  },
  tfTextActive: {
    color: DESIGN_TOKENS.colors.primary,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 6,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[500],
  },
  tabTextActive: {
    color: DESIGN_TOKENS.colors.primary,
    fontWeight: '700',
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
