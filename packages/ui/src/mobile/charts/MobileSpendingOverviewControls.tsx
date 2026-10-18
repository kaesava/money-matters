import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SpendingTimeframe } from '@money-matters/types';
import { DESIGN_TOKENS } from '../../tokens';
import { t } from '@money-matters/i18n';

export type ChartTab = 'HORIZON' | 'CASH_FLOW' | 'TOP_POOLS';

export interface MobileSpendingOverviewLabels {
  overviewTitle?: string;
  overviewSubtitle?: string;
  filteredOverviewTitle?: string;
  filteredOverviewSubtitle?: string;
  donutTitle?: string;
  filteredDonutTitle?: string;
  cashFlowTitle?: string;
  filteredCashFlowTitle?: string;
  topPoolsTitle?: string;
  filteredTopPoolsTitle?: string;
  centerLabel?: string;
  inflowLegend?: string;
  outflowLegend?: string;
  emptyText?: string;
  tabHorizon?: string;
  tabCashFlow?: string;
  tabTopPools?: string;
}

export function CardHeader({
  isFiltered,
  isExpanded,
  onToggle,
  labels,
}: {
  isFiltered: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  labels?: MobileSpendingOverviewLabels;
}) {
  const title = isFiltered
    ? (labels?.filteredOverviewTitle || t('transactions.reporting.filteredOverviewTitle'))
    : (labels?.overviewTitle || t('transactions.reporting.overviewTitle'));
  const subtitle = isFiltered
    ? (labels?.filteredOverviewSubtitle || t('transactions.reporting.filteredOverviewSubtitle'))
    : (labels?.overviewSubtitle || t('transactions.reporting.overviewSubtitle'));

  return (
    <View style={styles.header}>
      <View style={styles.titleArea}>
        <View style={styles.iconBox}>
          <Feather name="pie-chart" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
        </View>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
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

export function TimeframePills({
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

export function TabSwitcher({
  isFiltered,
  activeTab,
  onSelectTab,
  labels,
}: {
  isFiltered: boolean;
  activeTab: ChartTab;
  onSelectTab: (tab: ChartTab) => void;
  labels?: MobileSpendingOverviewLabels;
}) {
  const horizonLabel = isFiltered
    ? (labels?.filteredDonutTitle || t('transactions.reporting.donut.filteredTitle'))
    : (labels?.tabHorizon || labels?.donutTitle || t('transactions.reporting.tabs.horizon'));

  const cashFlowLabel = isFiltered
    ? (labels?.filteredCashFlowTitle || t('transactions.reporting.cashFlow.filteredTitle'))
    : (labels?.tabCashFlow || labels?.cashFlowTitle || t('transactions.reporting.tabs.cashFlow'));

  const topPoolsLabel = isFiltered
    ? (labels?.filteredTopPoolsTitle || t('transactions.reporting.topPools.filteredTitle'))
    : (labels?.tabTopPools || labels?.topPoolsTitle || t('transactions.reporting.tabs.topPools'));

  const tabs: Array<{ key: ChartTab; label: string }> = [
    { key: 'HORIZON', label: horizonLabel },
    { key: 'CASH_FLOW', label: cashFlowLabel },
    { key: 'TOP_POOLS', label: topPoolsLabel },
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

const styles = StyleSheet.create({
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
});
