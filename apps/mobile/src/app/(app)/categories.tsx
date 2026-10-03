import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  BankProviderBadge,
  SkeletonCard,
  SearchInput,
  RecordFilterBadge,
  CardDrawerIndicator,
} from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { formatAUD } from '../../lib/format';
import { CategoryFormModal } from '../../components/CategoryFormModal';
import { QuickExpenseModal } from '../../components/QuickExpenseModal';
import {
  PoolsFilterSheet,
  PoolSortField,
  PoolTypeFilter,
  PrivacyFilter,
} from '../../components/categories/PoolsFilterSheet';

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

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<PoolSortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [typeFilter, setTypeFilter] = useState<PoolTypeFilter>('ALL');
  const [privacyFilter, setPrivacyFilter] = useState<PrivacyFilter>('ALL');

  // Expansion states
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>({});
  const [expandedPools, setExpandedPools] = useState<Record<string, boolean>>({});

  const toggleTypeCollapse = (type: string) => {
    setCollapsedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const togglePoolExpand = (poolId: string) => {
    setExpandedPools((prev) => ({ ...prev, [poolId]: !prev[poolId] }));
  };

  const poolsQuery = trpc.listPools.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const categoriesQuery = trpc.listCategories.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const pools = poolsQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      poolsQuery.refetch(),
      bankAccountsQuery.refetch(),
      categoriesQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const getBankForPool = (bankAccountId?: string | null) =>
    bankAccounts.find((b) => b.id === bankAccountId);

  const activeFilterCount =
    (typeFilter !== 'ALL' ? 1 : 0) +
    (privacyFilter !== 'ALL' ? 1 : 0) +
    (sortField !== 'name' || sortOrder !== 'asc' ? 1 : 0);

  // Filtered & sorted pools
  const filteredPools = useMemo(() => {
    return pools
      .filter((p) => {
        if (activePoolIdFilter && p.id !== activePoolIdFilter) return false;
        if (
          activeCategoryIdFilter &&
          !categories.some((c) => c.poolId === p.id && c.id === activeCategoryIdFilter)
        )
          return false;

        if (typeFilter !== 'ALL' && p.poolType !== typeFilter) return false;
        if (privacyFilter === 'SHARED' && p.isPrivate) return false;
        if (privacyFilter === 'PRIVATE' && !p.isPrivate) return false;

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const matchesPool = p.name.toLowerCase().includes(q);
        const bank = getBankForPool(p.bankAccountId);
        const matchesBank = bank?.name.toLowerCase().includes(q);
        const matchesCat = categories.some(
          (c) => c.poolId === p.id && c.name.toLowerCase().includes(q)
        );

        return matchesPool || matchesBank || matchesCat;
      })
      .sort((a, b) => {
        if (sortField === 'name') {
          const res = a.name.localeCompare(b.name);
          return sortOrder === 'asc' ? res : -res;
        }
        if (sortField === 'currentBalance') {
          const aBal = a.currentBalance || 0;
          const bBal = b.currentBalance || 0;
          return sortOrder === 'asc' ? aBal - bBal : bBal - aBal;
        }
        if (sortField === 'targetAmount') {
          const aTgt = a.targetAmount ? parseFloat(a.targetAmount) : 0;
          const bTgt = b.targetAmount ? parseFloat(b.targetAmount) : 0;
          return sortOrder === 'asc' ? aTgt - bTgt : bTgt - aTgt;
        }
        return 0;
      });
  }, [
    pools,
    activePoolIdFilter,
    activeCategoryIdFilter,
    typeFilter,
    privacyFilter,
    searchQuery,
    sortField,
    sortOrder,
    bankAccounts,
    categories,
  ]);

  const matchedActivePool = pools.find((p) => p.id === activePoolIdFilter);
  const matchedActiveCat = categories.find((c) => c.id === activeCategoryIdFilter);

  const everydayPools = filteredPools.filter((p) => p.poolType === 'EVERYDAY');
  const billsPools = filteredPools.filter((p) => p.poolType === 'REGULAR');
  const goalPools = filteredPools.filter((p) => p.poolType === 'GOAL');

  const renderPoolCard = (pool: (typeof pools)[0]) => {
    const bank = getBankForPool(pool.bankAccountId);
    const poolCats = categories.filter((c) => c.poolId === pool.id);
    const nestedCount = poolCats.length;
    const isExpanded = !!expandedPools[pool.id];
    const isGoal = pool.poolType === 'GOAL';
    const target = pool.targetAmount ? parseFloat(pool.targetAmount) : 0;
    const pct = target > 0 ? Math.min(100, Math.round(((pool.currentBalance || 0) / target) * 100)) : 0;

    return (
      <View key={pool.id} style={styles.poolCard}>
        {/* Main Tappable Header */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push(`/(app)/pools/${pool.id}` as never)}
          style={styles.cardHeader}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.poolName}>{pool.name}</Text>
              {pool.isSurplusTarget && (
                <View style={styles.surplusBadge}>
                  <Text style={styles.surplusBadgeText}>
                    {t('categories.surplusBadgeText')}
                  </Text>
                </View>
              )}
            </View>
            {bank && (
              <View style={styles.bankBadgeWrap}>
                <BankProviderBadge provider={bank.bankProvider} size="sm" />
                <Text style={styles.bankNameText}>{bank.name}</Text>
              </View>
            )}
          </View>

          <View style={styles.balWrap}>
            <View style={styles.balCol}>
              <Text style={styles.balNum}>{formatAUD(pool.currentBalance)}</Text>
              <Text style={styles.balSub}>
                {isGoal
                  ? target > 0
                    ? `${pct}% of ${formatAUD(target)}`
                    : t('categories.noTarget')
                  : nestedCount > 0
                  ? t('categories.nestedCategories', { count: nestedCount })
                  : t('categories.mainPool')}
              </Text>
            </View>
            <CardDrawerIndicator size={18} />
          </View>
        </TouchableOpacity>

        {isGoal && target > 0 && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        )}

        {/* Inline Category Expand Toggle if pool has categories */}
        {nestedCount > 0 && !isGoal && (
          <View style={styles.nestedSection}>
            <TouchableOpacity
              onPress={() => togglePoolExpand(pool.id)}
              style={styles.nestedToggleBtn}
            >
              <Feather
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="#64748B"
              />
              <Text style={styles.nestedToggleText}>
                {isExpanded
                  ? t('common.close')
                  : t('categories.nestedCategories', { count: nestedCount })}
              </Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.nestedCategoriesList}>
                {poolCats.map((cat) => (
                  <View key={cat.id} style={styles.nestedCategoryRow}>
                    <View style={styles.nestedCatInfo}>
                      <Text style={styles.nestedCatName}>{cat.name}</Text>
                      {cat.isEssential && (
                        <View style={styles.essentialBadge}>
                          <Text style={styles.essentialText}>
                            {t('categories.essentialBadge')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.nestedCatAmount}>
                      {formatAUD(cat.enteredAmount || cat.monthlyAmount || 0)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <AppScreenWrapper
      title={t('categories.title')}
      scrollable={false}
      infoTooltip={{
        title: t('tooltips.categories.title'),
        content: t('tooltips.categories.content'),
      }}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
          />
        }
      >
        {/* Unified Search + Filter + Overflow Toolbar */}
        <View style={styles.toolbarRow}>
          <View style={{ flex: 1 }}>
            <SearchInput
              placeholder={t('categories.searchPlaceholder')}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
            onPress={() => setFilterSheetVisible(true)}
            accessibilityLabel={t('common.filter')}
          >
            <Feather
              name="sliders"
              size={15}
              color={activeFilterCount > 0 ? '#2563eb' : '#64748B'}
            />
            {activeFilterCount > 0 && (
              <Text style={styles.filterBtnBadgeText}>({activeFilterCount})</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setOverflowMenuVisible(true)}
            style={styles.overflowBtn}
            accessibilityLabel={t('categories.moreOptions')}
          >
            <Feather name="more-horizontal" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Active Pre-filter Badge if navigated from History */}
        {(activePoolIdFilter || activeCategoryIdFilter) && (
          <View style={{ marginBottom: 4 }}>
            <RecordFilterBadge
              label={
                matchedActivePool
                  ? `Filtered to Pool: ${matchedActivePool.name}`
                  : matchedActiveCat
                  ? `Filtered to Category: ${matchedActiveCat.name}`
                  : 'Filtered: Item unavailable'
              }
              onClear={() => {
                setActivePoolIdFilter(null);
                setActiveCategoryIdFilter(null);
                router.setParams({ poolId: undefined, categoryId: undefined } as never);
              }}
            />
          </View>
        )}

        {poolsQuery.isLoading ? (
          <SkeletonCard count={3} />
        ) : (
          <View style={styles.sectionsContainer}>
            {/* Everyday Pool Group */}
            {everydayPools.length > 0 && (
              <View style={styles.poolGroup}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleTypeCollapse('EVERYDAY')}
                  style={styles.groupHeader}
                >
                  <View style={styles.groupHeaderTitleWrap}>
                    <Feather
                      name={collapsedTypes['EVERYDAY'] ? 'chevron-right' : 'chevron-down'}
                      size={16}
                      color="#1B2B4B"
                    />
                    <Text style={styles.groupTitle}>
                      {t('categories.everydayPoolsUpper')}
                    </Text>
                  </View>
                  <Text style={styles.groupCount}>{everydayPools.length}</Text>
                </TouchableOpacity>

                {!collapsedTypes['EVERYDAY'] && everydayPools.map(renderPoolCard)}
              </View>
            )}

            {/* Regular Bills Group */}
            {billsPools.length > 0 && (
              <View style={styles.poolGroup}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleTypeCollapse('REGULAR')}
                  style={styles.groupHeader}
                >
                  <View style={styles.groupHeaderTitleWrap}>
                    <Feather
                      name={collapsedTypes['REGULAR'] ? 'chevron-right' : 'chevron-down'}
                      size={16}
                      color="#1B2B4B"
                    />
                    <Text style={styles.groupTitle}>
                      {t('categories.billsPoolsUpper')}
                    </Text>
                  </View>
                  <Text style={styles.groupCount}>{billsPools.length}</Text>
                </TouchableOpacity>

                {!collapsedTypes['REGULAR'] && billsPools.map(renderPoolCard)}
              </View>
            )}

            {/* Savings Goals Group */}
            {goalPools.length > 0 && (
              <View style={styles.poolGroup}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleTypeCollapse('GOAL')}
                  style={styles.groupHeader}
                >
                  <View style={styles.groupHeaderTitleWrap}>
                    <Feather
                      name={collapsedTypes['GOAL'] ? 'chevron-right' : 'chevron-down'}
                      size={16}
                      color="#1B2B4B"
                    />
                    <Text style={styles.groupTitle}>
                      {t('categories.goalsUpper')}
                    </Text>
                  </View>
                  <Text style={styles.groupCount}>{goalPools.length}</Text>
                </TouchableOpacity>

                {!collapsedTypes['GOAL'] && goalPools.map(renderPoolCard)}
              </View>
            )}

            {filteredPools.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>
                  {poolsQuery.isError
                    ? t('common.error')
                    : pools.length === 0
                    ? t('categories.poolNotFound')
                    : t('categories.noCategoriesMatched')}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Overflow Menu Sheet */}
      <Modal
        visible={overflowMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOverflowMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOverflowMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setOverflowMenuVisible(false);
                setMoveMoneyVisible(true);
              }}
            >
              <Feather name="repeat" size={16} color="#475569" />
              <Text style={styles.menuItemText}>{t('dashboard.moveMoney')}</Text>
            </TouchableOpacity>

            <View style={styles.menuItemDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setOverflowMenuVisible(false);
                router.push('/(app)/pools/projection' as never);
              }}
            >
              <Feather name="trending-up" size={16} color="#475569" />
              <Text style={styles.menuItemText}>{t('categories.projectionModeTitle')}</Text>
            </TouchableOpacity>

            <View style={styles.menuItemDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setOverflowMenuVisible(false);
                router.push({ pathname: '/(setup)/income', params: { mode: 'rerun' } } as Href);
              }}
            >
              <Feather name="settings" size={16} color="#475569" />
              <Text style={styles.menuItemText}>{t('categories.recalibrateBudget')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Pools Filter Bottom Sheet */}
      <PoolsFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        activeCount={activeFilterCount}
        sortField={sortField}
        sortOrder={sortOrder}
        typeFilter={typeFilter}
        privacyFilter={privacyFilter}
        onSortFieldChange={setSortField}
        onSortOrderChange={setSortOrder}
        onTypeFilterChange={setTypeFilter}
        onPrivacyFilterChange={setPrivacyFilter}
        onReset={() => {
          setSortField('name');
          setSortOrder('asc');
          setTypeFilter('ALL');
          setPrivacyFilter('ALL');
        }}
      />

      {/* Add Pool Modal */}
      <CategoryFormModal
        visible={poolModalVisible}
        onClose={() => setPoolModalVisible(false)}
        onSuccess={() => poolsQuery.refetch()}
      />

      {/* Move Money Modal */}
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
  scrollContent: {
    padding: 20,
    gap: 14,
    paddingBottom: 90,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  filterBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    width: 'auto',
    paddingHorizontal: 10,
  },
  filterBtnBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  overflowBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  sectionsContainer: {
    gap: 18,
  },
  poolGroup: {
    gap: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  groupHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2B4B',
    letterSpacing: 0.5,
  },
  groupCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  poolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  poolName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  surplusBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  surplusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#047857',
  },
  bankBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  bankNameText: {
    fontSize: 11,
    color: '#64748B',
  },
  balWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balCol: {
    alignItems: 'flex-end',
  },
  balNum: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  balSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  progressTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2.5,
  },
  nestedSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  nestedToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nestedToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  nestedCategoriesList: {
    marginTop: 8,
    gap: 6,
    paddingLeft: 8,
  },
  nestedCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  nestedCatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nestedCatName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  essentialBadge: {
    backgroundColor: '#FEF2F2',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  essentialText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#BA1A1A',
  },
  nestedCatAmount: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 110,
    paddingRight: 20,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    minWidth: 220,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  menuItemDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
});
