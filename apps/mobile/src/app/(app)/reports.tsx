import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  SegmentedTabs,
  MobileSpendingOverviewCard,
  MobileFilterSheet,
  MobileBankPicker,
  SearchInput,
  DESIGN_TOKENS,
} from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { useAppFeatures } from '../../context/useAppFeatures';
import { formatMobileCurrency } from '../../lib/format';
import type { SpendingTimeframe, SpendingFlowType } from '@money-matters/types';

type ReportTabKey = 'spending' | 'paydayPlans';

export default function ReportsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { hasReports } = useAppFeatures();
  const { data: session } = authClient.useSession();

  const [activeTab, setActiveTab] = useState<ReportTabKey>(
    params.tab === 'payday-plans' ? 'paydayPlans' : 'spending'
  );
  const [refreshing, setRefreshing] = useState(false);

  // Tab 1 (Spending) state
  const [spendingTimeframe, setSpendingTimeframe] = useState<SpendingTimeframe>('90D');
  const [spendingSearch, setSpendingSearch] = useState('');
  const [debouncedSpendingSearch, setDebouncedSpendingSearch] = useState('');
  const [spendingPoolId, setSpendingPoolId] = useState('ALL');
  const [spendingBankId, setSpendingBankId] = useState('ALL');
  const [spendingFlowType, setSpendingFlowType] = useState<SpendingFlowType>('ALL');
  const [spendingFilterSheetVisible, setSpendingFilterSheetVisible] = useState(false);

  // Tab 2 (Payday Plans) state
  const [planTimeframe, setPlanTimeframe] = useState<SpendingTimeframe>('90D');
  const [planSearch, setPlanSearch] = useState('');
  const [debouncedPlanSearch, setDebouncedPlanSearch] = useState('');
  const [planBankId, setPlanBankId] = useState('ALL');
  const [planFilterSheetVisible, setPlanFilterSheetVisible] = useState(false);

  // Feature gate redirect
  useEffect(() => {
    if (!hasReports) {
      router.replace('/(app)/home' as Href);
    }
  }, [hasReports, router]);

  // Debounce search inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSpendingSearch(spendingSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [spendingSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPlanSearch(planSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [planSearch]);

  // Queries
  const poolsQuery = trpc.listPools.useQuery(undefined, {
    enabled: !!session?.user && hasReports,
  });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, {
    enabled: !!session?.user && hasReports,
  });

  const pools = poolsQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];

  const spendingAnalyticsQuery = trpc.getSpendingAnalytics.useQuery(
    {
      timeframe: spendingTimeframe,
      envelopeId: spendingPoolId !== 'ALL' ? spendingPoolId : undefined,
      bankAccountId: spendingBankId !== 'ALL' ? spendingBankId : undefined,
      searchQuery:
        debouncedSpendingSearch.trim().length >= 2 ? debouncedSpendingSearch.trim() : undefined,
      flowType: spendingFlowType,
    },
    { enabled: !!session?.user && hasReports && activeTab === 'spending' }
  );

  const incomeSplitAnalyticsQuery = trpc.getIncomeSplitAnalytics.useQuery(
    {
      timeframe: planTimeframe,
      bankAccountId: planBankId !== 'ALL' ? planBankId : undefined,
      searchQuery:
        debouncedPlanSearch.trim().length >= 2 ? debouncedPlanSearch.trim() : undefined,
    },
    { enabled: !!session?.user && hasReports && activeTab === 'paydayPlans' }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      poolsQuery.refetch(),
      bankAccountsQuery.refetch(),
      activeTab === 'spending'
        ? spendingAnalyticsQuery.refetch()
        : incomeSplitAnalyticsQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const spendingActiveFilterCount =
    (spendingPoolId !== 'ALL' ? 1 : 0) +
    (spendingBankId !== 'ALL' ? 1 : 0) +
    (spendingFlowType !== 'ALL' ? 1 : 0);

  const planActiveFilterCount = planBankId !== 'ALL' ? 1 : 0;

  const incomeSplitLabels = useMemo(
    () => ({
      overviewTitle: t('transactions.reporting.incomeSplits.overviewTitle'),
      overviewSubtitle: t('transactions.reporting.incomeSplits.overviewSubtitle'),
      filteredOverviewTitle: t('transactions.reporting.incomeSplits.filteredOverviewTitle'),
      filteredOverviewSubtitle: t('transactions.reporting.incomeSplits.filteredOverviewSubtitle'),
      donutTitle: t('transactions.reporting.incomeSplits.donutTitle'),
      filteredDonutTitle: t('transactions.reporting.incomeSplits.filteredDonutTitle'),
      cashFlowTitle: t('transactions.reporting.incomeSplits.cashFlowTitle'),
      filteredCashFlowTitle: t('transactions.reporting.incomeSplits.filteredCashFlowTitle'),
      topPoolsTitle: t('transactions.reporting.incomeSplits.topPoolsTitle'),
      filteredTopPoolsTitle: t('transactions.reporting.incomeSplits.filteredTopPoolsTitle'),
      inflowLegend: t('transactions.reporting.incomeSplits.inflow'),
      outflowLegend: t('transactions.reporting.incomeSplits.sweepOutflow'),
      centerLabel: t('transactions.reporting.incomeSplits.totalAllocated'),
      emptyText: t('transactions.reporting.incomeSplits.empty'),
      tabHorizon: t('transactions.reporting.incomeSplits.tabHorizon'),
      tabCashFlow: t('transactions.reporting.incomeSplits.tabSweep'),
      tabTopPools: t('transactions.reporting.incomeSplits.tabTopPools'),
    }),
    []
  );

  return (
    <AppScreenWrapper title={t('reports.title')} showBack={true} scrollable={false}>
      <View style={styles.container}>
        <SegmentedTabs<ReportTabKey>
          tabs={[
            { key: 'spending', label: t('reports.tabs.spending') },
            { key: 'paydayPlans', label: t('reports.tabs.paydayPlans') },
          ]}
          activeKey={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'spending' ? (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={DESIGN_TOKENS.colors.sereneBlue}
              />
            }
          >
            {/* Filter Bar */}
            <View style={styles.filterRow}>
              <View style={styles.searchWrap}>
                <SearchInput
                  placeholder={t('transactions.searchPlaceholder')}
                  value={spendingSearch}
                  onChangeText={setSpendingSearch}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  spendingActiveFilterCount > 0 && styles.filterBtnActive,
                ]}
                onPress={() => setSpendingFilterSheetVisible(true)}
                activeOpacity={0.7}
              >
                <Feather
                  name="sliders"
                  size={15}
                  color={
                    spendingActiveFilterCount > 0
                      ? DESIGN_TOKENS.colors.sereneBlue
                      : DESIGN_TOKENS.colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.filterBtnText,
                    spendingActiveFilterCount > 0 && styles.filterBtnTextActive,
                  ]}
                >
                  {t('common.filter')}
                  {spendingActiveFilterCount > 0 ? ` (${spendingActiveFilterCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Visual Analytics */}
            <MobileSpendingOverviewCard
              analytics={spendingAnalyticsQuery.data}
              isLoading={spendingAnalyticsQuery.isLoading}
              timeframe={spendingTimeframe}
              onTimeframeChange={setSpendingTimeframe}
              formatCurrency={formatMobileCurrency}
            />
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={DESIGN_TOKENS.colors.sereneBlue}
              />
            }
          >
            {/* Filter Bar */}
            <View style={styles.filterRow}>
              <View style={styles.searchWrap}>
                <SearchInput
                  placeholder={t('transactions.searchPaydaysPlaceholder')}
                  value={planSearch}
                  onChangeText={setPlanSearch}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  planActiveFilterCount > 0 && styles.filterBtnActive,
                ]}
                onPress={() => setPlanFilterSheetVisible(true)}
                activeOpacity={0.7}
              >
                <Feather
                  name="sliders"
                  size={15}
                  color={
                    planActiveFilterCount > 0
                      ? DESIGN_TOKENS.colors.sereneBlue
                      : DESIGN_TOKENS.colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.filterBtnText,
                    planActiveFilterCount > 0 && styles.filterBtnTextActive,
                  ]}
                >
                  {t('common.filter')}
                  {planActiveFilterCount > 0 ? ` (${planActiveFilterCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Visual Analytics */}
            <MobileSpendingOverviewCard
              analytics={incomeSplitAnalyticsQuery.data}
              isLoading={incomeSplitAnalyticsQuery.isLoading}
              timeframe={planTimeframe}
              onTimeframeChange={setPlanTimeframe}
              formatCurrency={formatMobileCurrency}
              labels={incomeSplitLabels}
              showPayeesWhenFiltered={false}
            />
          </ScrollView>
        )}

        {/* Spending Filter Sheet */}
        <MobileFilterSheet
          visible={spendingFilterSheetVisible}
          onClose={() => setSpendingFilterSheetVisible(false)}
          activeCount={spendingActiveFilterCount}
          sections={[
            {
              id: 'flowType',
              title: t('transactions.flowType'),
              options: [
                { id: 'ALL', label: t('reports.filters.allFlows') },
                { id: 'DEBIT', label: t('reports.filters.debitsOnly') },
                { id: 'CREDIT', label: t('reports.filters.creditsOnly') },
                { id: 'TRANSFER', label: t('reports.filters.transfersOnly') },
              ],
              selectedValue: spendingFlowType,
              onSelect: (id: string) => setSpendingFlowType(id as SpendingFlowType),
            },
            {
              id: 'bank',
              title: t('bankAccounts.title'),
              renderCustom: () => (
                <MobileBankPicker
                  banks={bankAccounts.map((b) => ({ id: b.id, name: b.name }))}
                  selectedBankId={spendingBankId}
                  onSelectBank={setSpendingBankId}
                  allowAllOption={true}
                />
              ),
            },
            {
              id: 'pool',
              title: t('categories.title'),
              options: [
                { id: 'ALL', label: t('reports.filters.allEnvelopes') },
                ...pools.map((p) => ({ id: p.id, label: p.name })),
              ],
              selectedValue: spendingPoolId,
              onSelect: (id: string) => setSpendingPoolId(id),
            },
          ]}
          onReset={() => {
            setSpendingFlowType('ALL');
            setSpendingBankId('ALL');
            setSpendingPoolId('ALL');
          }}
        />

        {/* Payday Plans Filter Sheet */}
        <MobileFilterSheet
          visible={planFilterSheetVisible}
          onClose={() => setPlanFilterSheetVisible(false)}
          activeCount={planActiveFilterCount}
          sections={[
            {
              id: 'bank',
              title: t('bankAccounts.title'),
              renderCustom: () => (
                <MobileBankPicker
                  banks={bankAccounts.map((b) => ({ id: b.id, name: b.name }))}
                  selectedBankId={planBankId}
                  onSelectBank={setPlanBankId}
                  allowAllOption={true}
                />
              ),
            },
          ]}
          onReset={() => {
            setPlanBankId('ALL');
          }}
        />
      </View>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchWrap: {
    flex: 1,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    backgroundColor: DESIGN_TOKENS.colors.cardBg,
  },
  filterBtnActive: {
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue + '10',
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  filterBtnTextActive: {
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
});
