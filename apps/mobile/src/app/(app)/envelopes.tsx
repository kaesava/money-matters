import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  SkeletonCard,
  SearchInput,
  RecordFilterBadge,
} from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { EnvelopeFormModal } from '../../components/EnvelopeFormModal';
import { QuickExpenseModal } from '../../components/QuickExpenseModal';
import { PoolOverflowMenuModal } from '../../components/envelopes/PoolOverflowMenuModal';
import { PoolGroupSection } from '../../components/envelopes/PoolGroupSection';
import { EnvelopesFilterSheet } from '../../components/envelopes/EnvelopesFilterSheet';
import {
  useEnvelopesFilter,
  type PoolSortField,
  type PoolTypeFilter,
  type PrivacyFilter,
} from '../../components/envelopes/useEnvelopesFilter';

export default function PoolsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ poolId?: string; categoryId?: string }>();
  const { data: session } = authClient.useSession();

  const [refreshing, setRefreshing] = useState(false);
  const [poolModalVisible, setPoolModalVisible] = useState(false);
  const [defaultPoolType, setDefaultPoolType] = useState<'EVERYDAY' | 'REGULAR' | 'GOAL'>('REGULAR');
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);
  const [overflowMenuVisible, setOverflowMenuVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>({});

  const toggleTypeCollapse = (type: string) =>
    setCollapsedTypes((prev) => ({ ...prev, [type]: !prev[type] }));

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: !!session?.user });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: !!session?.user });

  const pools = poolsQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];

  const {
    activePoolIdFilter,
    setActivePoolIdFilter,
    searchQuery,
    setSearchQuery,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    typeFilter,
    setTypeFilter,
    privacyFilter,
    setPrivacyFilter,
    activeFilterCount,
    filteredPools,
    resetFilters,
  } = useEnvelopesFilter({
    pools,
    bankAccounts,
    initialPoolId: params.poolId || null,
  });

  React.useEffect(() => {
    if (params.poolId) setActivePoolIdFilter(params.poolId);
  }, [params.poolId, setActivePoolIdFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([poolsQuery.refetch(), bankAccountsQuery.refetch()]);
    setRefreshing(false);
  };

  const matchedActivePool = pools.find((p) => p.id === activePoolIdFilter);

  return (
    <AppScreenWrapper
      title={t('categories.title')}
      scrollable={false}
      infoTooltip={{ title: t('tooltips.categories.title'), content: t('tooltips.categories.content') }}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={DESIGN_TOKENS.colors.accent} />}
      >
        <View style={styles.toolbarRow}>
          <View style={{ flex: 1 }}>
            <SearchInput placeholder={t('categories.searchPlaceholder')} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
            onPress={() => setFilterSheetVisible(true)}
          >
            <Feather name="sliders" size={15} color={activeFilterCount > 0 ? DESIGN_TOKENS.colors.accent : DESIGN_TOKENS.colors.slate[500]} />
            {activeFilterCount > 0 && <Text style={styles.filterBtnBadgeText}>({activeFilterCount})</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOverflowMenuVisible(true)} style={styles.overflowBtn}>
            <Feather name="more-horizontal" size={18} color={DESIGN_TOKENS.colors.slate[500]} />
          </TouchableOpacity>
        </View>

        {activePoolIdFilter && (
          <RecordFilterBadge
            label={
              matchedActivePool
                ? t('categories.filteredToPool', { name: matchedActivePool.name })
                : t('common.all')
            }
            onClear={() => {
              setActivePoolIdFilter(null);
              router.setParams({ poolId: '', categoryId: '' });
            }}
          />
        )}

        {poolsQuery.isLoading ? (
          <SkeletonCard count={3} />
        ) : (
          <View style={styles.sectionsContainer}>
            <PoolGroupSection
              title={t('categories.everydayPoolsUpper')}
              pools={filteredPools.filter((p) => p.envelopeType === 'EVERYDAY')}
              isCollapsed={!!collapsedTypes['EVERYDAY']}
              onToggleCollapse={() => toggleTypeCollapse('EVERYDAY')}
              bankAccounts={bankAccounts}
              groupType="EVERYDAY"
            />
            <PoolGroupSection
              title={t('categories.billsPoolsUpper')}
              pools={filteredPools.filter((p) => p.envelopeType === 'SCHEDULED_BILL' || p.envelopeType === 'FLEXIBLE_BILL')}
              isCollapsed={!!collapsedTypes['REGULAR']}
              onToggleCollapse={() => toggleTypeCollapse('REGULAR')}
              bankAccounts={bankAccounts}
              groupType="REGULAR"
              onAddPool={(gType) => {
                setDefaultPoolType(gType);
                setPoolModalVisible(true);
              }}
            />
            <PoolGroupSection
              title={t('categories.goalsUpper')}
              pools={filteredPools.filter((p) => p.envelopeType === 'TARGET_GOAL' || p.envelopeType === 'ONGOING_GOAL')}
              isCollapsed={!!collapsedTypes['GOAL']}
              onToggleCollapse={() => toggleTypeCollapse('GOAL')}
              bankAccounts={bankAccounts}
              groupType="GOAL"
              onAddPool={(gType) => {
                setDefaultPoolType(gType);
                setPoolModalVisible(true);
              }}
            />
            {filteredPools.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>
                  {poolsQuery.isError ? t('common.error') : pools.length === 0 ? t('categories.poolNotFound') : t('categories.noEnvelopesFound')}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <PoolOverflowMenuModal
        visible={overflowMenuVisible}
        onClose={() => setOverflowMenuVisible(false)}
        onMoveMoney={() => setMoveMoneyVisible(true)}
      />

      <EnvelopesFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        activeFilterCount={activeFilterCount}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortFieldChange={setSortField}
        onSortOrderChange={setSortOrder}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        privacyFilter={privacyFilter}
        setPrivacyFilter={setPrivacyFilter}
        onReset={resetFilters}
      />

      <EnvelopeFormModal
        visible={poolModalVisible}
        defaultType={defaultPoolType}
        onClose={() => setPoolModalVisible(false)}
        onSuccess={() => poolsQuery.refetch()}
      />
      <QuickExpenseModal
        visible={moveMoneyVisible}
        initialType="TRANSFER"
        onClose={() => setMoveMoneyVisible(false)}
        onSuccess={() => poolsQuery.refetch()}
      />
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, gap: 14, paddingBottom: 90 },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 44,
    height: 44,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1.5,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 12,
  },
  filterBtnActive: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
  },
  filterBtnBadgeText: { fontSize: 11, fontWeight: '800', color: DESIGN_TOKENS.colors.accent },
  overflowBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1.5,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionsContainer: { gap: 4 },
  emptyCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceVariant, padding: 32, borderRadius: 16, alignItems: 'center' },
  emptyCardText: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
});
