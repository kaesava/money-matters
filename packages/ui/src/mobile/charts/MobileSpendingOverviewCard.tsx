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

  const timeframes: Array<{ key: SpendingTimeframe; label: string }> = [
    { key: '30D', label: t('transactions.reporting.timeframe.d30') },
    { key: '90D', label: t('transactions.reporting.timeframe.d90') },
    { key: '1Y', label: t('transactions.reporting.timeframe.y1') },
  ];

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <View style={styles.iconBox}>
            <Feather name="pie-chart" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
          </View>
          <View>
            <Text style={styles.title}>{t('transactions.reporting.overviewTitle')}</Text>
            <Text style={styles.subtitle}>{t('transactions.reporting.overviewSubtitle')}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.collapseBtn}
          activeOpacity={0.7}
        >
          <Feather
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={DESIGN_TOKENS.colors.slate[500]}
          />
        </TouchableOpacity>
      </View>

      {isExpanded && (
        <View style={styles.content}>
          {/* Controls: Timeframe Pills & Segmented Tabs */}
          <View style={styles.controlsRow}>
            {/* Timeframe Chips */}
            <View style={styles.timeframePills}>
              {timeframes.map((tf) => (
                <TouchableOpacity
                  key={tf.key}
                  onPress={() => onTimeframeChange(tf.key)}
                  style={[
                    styles.tfButton,
                    timeframe === tf.key && styles.tfButtonActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tfText,
                      timeframe === tf.key && styles.tfTextActive,
                    ]}
                  >
                    {tf.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Segmented Tab Switcher */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              onPress={() => setActiveTab('HORIZON')}
              style={[styles.tabItem, activeTab === 'HORIZON' && styles.tabItemActive]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'HORIZON' && styles.tabTextActive,
                ]}
              >
                {t('transactions.reporting.tabs.horizon')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('CASH_FLOW')}
              style={[styles.tabItem, activeTab === 'CASH_FLOW' && styles.tabItemActive]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'CASH_FLOW' && styles.tabTextActive,
                ]}
              >
                {t('transactions.reporting.tabs.cashFlow')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('TOP_POOLS')}
              style={[styles.tabItem, activeTab === 'TOP_POOLS' && styles.tabItemActive]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'TOP_POOLS' && styles.tabTextActive,
                ]}
              >
                {t('transactions.reporting.tabs.topPools')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Active Chart Display */}
          {isLoading ? (
            <View style={styles.loadingArea}>
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : !analytics || analytics.isEmpty ? (
            <View style={styles.emptyArea}>
              <Text style={styles.emptyText}>{t('transactions.reporting.donut.empty')}</Text>
            </View>
          ) : (
            <View style={styles.chartArea}>
              {activeTab === 'HORIZON' && (
                <MobileDonutChart
                  data={analytics.horizonBreakdown}
                  formatCurrency={formatCurrency}
                />
              )}
              {activeTab === 'CASH_FLOW' && (
                <MobileBarTrendChart
                  data={analytics.monthlyCashFlow}
                  formatCurrency={formatCurrency}
                />
              )}
              {activeTab === 'TOP_POOLS' && (
                <MobileHorizontalRankedBarChart
                  topPools={analytics.topPools}
                  otherPoolsAmount={analytics.otherPoolsAmount}
                  totalOutflow={analytics.totalOutflow}
                  formatCurrency={formatCurrency}
                />
              )}
            </View>
          )}
        </View>
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
    fontWeight: '500',
    color: DESIGN_TOKENS.colors.slate[500],
  },
  collapseBtn: {
    padding: 6,
  },
  content: {
    padding: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  timeframePills: {
    flexDirection: 'row',
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 8,
    padding: 2,
  },
  tfButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tfButtonActive: {
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  tfText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  tfTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 2,
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 6,
  },
  tabItemActive: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[500],
  },
  tabTextActive: {
    color: DESIGN_TOKENS.colors.slate[800],
    fontWeight: '700',
  },
  chartArea: {
    minHeight: 140,
  },
  loadingArea: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
  },
  emptyArea: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
  },
});
