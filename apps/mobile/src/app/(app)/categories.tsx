import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  SkeletonCard,
  SearchInput,
  RecordFilterBadge,
  MobileFilterSheet,
} from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { CategoryFormModal } from '../../components/CategoryFormModal';
import { QuickExpenseModal } from '../../components/QuickExpenseModal';
import { PoolOverflowMenuModal } from '../../components/categories/PoolOverflowMenuModal';
import { PoolGroupSection } from '../../components/categories/PoolGroupSection';

export type PoolSortField = 'name' | 'currentBalance' | 'targetAmount';
export type PoolTypeFilter = 'ALL' | 'EVERYDAY' | 'REGULAR' | 'SAVINGS';
export type PrivacyFilter = 'ALL' | 'SHARED' | 'PRIVATE';

export default function PoolsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ poolId?: string; categoryId?: string }>();
  const { data: session } = authClient.useSession();

  const [activePoolIdFilter, setActivePoolIdFilter] = useState<string | null>(params.poolId || null);
  const [activeCategoryIdFilter, setActiveCategoryIdFilter] = useState<string | null>(params.categoryId || null);

  React.useEffect(() => {
    if (params.poolId) setActivePoolIdFilter(params.poolId);
    if (params.categoryId) setActiveCategoryIdFilter(params.categoryId);
  }, [params.poolId, params.categoryId]);

  const [refreshing, setRefreshing] = useState(false);
  const [poolModalVisible, setPoolModalVisible] = useState(false);
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);
  const [overflowMenuVisible, setOverflowMenuVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<PoolSortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [typeFilter, setTypeFilter] = useState<PoolTypeFilter>('ALL');
  const [privacyFilter, setPrivacyFilter] = useState<PrivacyFilter>('ALL');
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>({});
  const [expandedPools, setExpandedPools] = useState<Record<string, boolean>>({});
  const toggleTypeCollapse = (type: string) => setCollapsedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  const togglePoolExpand = (poolId: string) => setExpandedPools((prev) => ({ ...prev, [poolId]: !prev[poolId] }));

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: !!session?.user });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: !!session?.user });
  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: !!session?.user });

  const pools = poolsQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([poolsQuery.refetch(), bankAccountsQuery.refetch(), categoriesQuery.refetch()]);
    setRefreshing(false);
  };

  const activeFilterCount =
    (typeFilter !== 'ALL' ? 1 : 0) +
    (privacyFilter !== 'ALL' ? 1 : 0) +
    (sortField !== 'name' || sortOrder !== 'asc' ? 1 : 0);

  const filteredPools = useMemo(() => {
    return pools
      .filter((p) => {
        if (activePoolIdFilter && p.id !== activePoolIdFilter) return false;
        if (activeCategoryIdFilter && !categories.some((c) => c.poolId === p.id && c.id === activeCategoryIdFilter)) return false;
        if (typeFilter !== 'ALL' && p.poolType !== typeFilter) return false;
        if (privacyFilter === 'SHARED' && p.isPrivate) return false;
        if (privacyFilter === 'PRIVATE' && !p.isPrivate) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const matchesPool = p.name.toLowerCase().includes(q);
        const bank = bankAccounts.find((b) => b.id === p.bankAccountId);
        const matchesBank = bank?.name.toLowerCase().includes(q);
        const matchesCat = categories.some((c) => c.poolId === p.id && c.name.toLowerCase().includes(q));
        return matchesPool || matchesBank || matchesCat;
      })
      .sort((a, b) => {
        if (sortField === 'name') {
          const res = a.name.localeCompare(b.name);
          return sortOrder === 'asc' ? res : -res;
        }
        if (sortField === 'currentBalance') {
          return sortOrder === 'asc' ? (a.currentBalance || 0) - (b.currentBalance || 0) : (b.currentBalance || 0) - (a.currentBalance || 0);
        }
        const aTgt = a.targetAmount ? parseFloat(a.targetAmount) : 0;
        const bTgt = b.targetAmount ? parseFloat(b.targetAmount) : 0;
        return sortOrder === 'asc' ? aTgt - bTgt : bTgt - aTgt;
      });
  }, [pools, activePoolIdFilter, activeCategoryIdFilter, typeFilter, privacyFilter, searchQuery, sortField, sortOrder, bankAccounts, categories]);

  const matchedActivePool = pools.find((p) => p.id === activePoolIdFilter);
  const matchedActiveCat = categories.find((c) => c.id === activeCategoryIdFilter);

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

        {(activePoolIdFilter || activeCategoryIdFilter) && (
          <RecordFilterBadge
            label={
              matchedActivePool
                ? t('categories.filteredToPool', { name: matchedActivePool.name })
                : matchedActiveCat
                ? t('categories.filteredToCategory', { name: matchedActiveCat.name })
                : t('common.all')
            }
            onClear={() => {
              setActivePoolIdFilter(null);
              setActiveCategoryIdFilter(null);
              router.setParams({ poolId: undefined, categoryId: undefined } as never);
            }}
          />
        )}

        {poolsQuery.isLoading ? (
          <SkeletonCard count={3} />
        ) : (
          <View style={styles.sectionsContainer}>
            <PoolGroupSection
              title={t('categories.everydayPoolsUpper')}
              pools={filteredPools.filter((p) => p.poolType === 'EVERYDAY')}
              isCollapsed={!!collapsedTypes['EVERYDAY']}
              onToggleCollapse={() => toggleTypeCollapse('EVERYDAY')}
              bankAccounts={bankAccounts}
              categories={categories}
              expandedPools={expandedPools}
              onTogglePoolExpand={togglePoolExpand}
            />
            <PoolGroupSection
              title={t('categories.billsPoolsUpper')}
              pools={filteredPools.filter((p) => p.poolType === 'REGULAR')}
              isCollapsed={!!collapsedTypes['REGULAR']}
              onToggleCollapse={() => toggleTypeCollapse('REGULAR')}
              bankAccounts={bankAccounts}
              categories={categories}
              expandedPools={expandedPools}
              onTogglePoolExpand={togglePoolExpand}
            />
            <PoolGroupSection
              title={t('categories.goalsUpper')}
              pools={filteredPools.filter((p) => p.poolType === 'GOAL')}
              isCollapsed={!!collapsedTypes['GOAL']}
              onToggleCollapse={() => toggleTypeCollapse('GOAL')}
              bankAccounts={bankAccounts}
              categories={categories}
              expandedPools={expandedPools}
              onTogglePoolExpand={togglePoolExpand}
            />
            {filteredPools.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>
                  {poolsQuery.isError ? t('common.error') : pools.length === 0 ? t('categories.poolNotFound') : t('categories.noCategoriesMatched')}
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

      <MobileFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        activeCount={activeFilterCount}
        sortField={sortField}
        sortOrder={sortOrder}
        sortOptions={[
          { id: 'name', label: t('common.name') },
          { id: 'currentBalance', label: t('common.balance') },
          { id: 'targetAmount', label: t('common.target') },
        ]}
        onSortFieldChange={(field) => setSortField(field as PoolSortField)}
        onSortOrderChange={setSortOrder}
        sections={[
          {
            id: 'type',
            title: t('categories.filterByType'),
            selectedValue: typeFilter,
            onSelect: (val) => setTypeFilter(val as PoolTypeFilter),
            options: [
              { id: 'ALL', label: t('common.all') }, { id: 'EVERYDAY', label: t('poolTypes.EVERYDAY') },
              { id: 'REGULAR', label: t('poolTypes.REGULAR') }, { id: 'SAVINGS', label: t('poolTypes.SAVINGS') },
            ],
          },
          {
            id: 'privacy',
            title: t('categories.filterByPrivacy'),
            selectedValue: privacyFilter,
            onSelect: (val) => setPrivacyFilter(val as PrivacyFilter),
            options: [
              { id: 'ALL', label: t('common.all') }, { id: 'SHARED', label: t('common.shared') }, { id: 'PRIVATE', label: t('common.private') },
            ],
          },
        ]}
        onReset={() => {
          setSortField('name'); setSortOrder('asc'); setTypeFilter('ALL'); setPrivacyFilter('ALL');
        }}
      />

      <CategoryFormModal visible={poolModalVisible} onClose={() => setPoolModalVisible(false)} onSuccess={() => poolsQuery.refetch()} />
      <QuickExpenseModal visible={moveMoneyVisible} initialType="TRANSFER" onClose={() => setMoveMoneyVisible(false)} onSuccess={() => poolsQuery.refetch()} />
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, gap: 14, paddingBottom: 90 },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, width: 44, height: 44, backgroundColor: DESIGN_TOKENS.colors.surface, borderWidth: 1.5, borderColor: DESIGN_TOKENS.colors.slate[200], borderRadius: 12 },
  filterBtnActive: { backgroundColor: DESIGN_TOKENS.colors.accentLight, borderColor: DESIGN_TOKENS.colors.accentBorder },
  filterBtnBadgeText: { fontSize: 11, fontWeight: '800', color: DESIGN_TOKENS.colors.accent },
  overflowBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: DESIGN_TOKENS.colors.surface, borderWidth: 1.5, borderColor: DESIGN_TOKENS.colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  sectionsContainer: { gap: 4 },
  emptyCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceVariant, padding: 32, borderRadius: 16, alignItems: 'center' },
  emptyCardText: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
});
