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
import { useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  BankProviderBadge,
  SkeletonCard,
  SearchInput,
} from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { formatAUD } from '../../lib/format';
import { CategoryFormModal } from '../../components/CategoryFormModal';
import { QuickExpenseModal } from '../../components/QuickExpenseModal';

const HORIZON_MONTHS = [0, 1, 2, 3, 6, 12];
type PoolTypeFilter = 'ALL' | 'EVERYDAY' | 'REGULAR' | 'GOAL';
type PrivacyFilter = 'ALL' | 'SHARED' | 'PRIVATE';

export default function PoolsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const [selectedHorizon, setSelectedHorizon] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [poolModalVisible, setPoolModalVisible] = useState(false);
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);
  const [overflowMenuVisible, setOverflowMenuVisible] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<PoolTypeFilter>('ALL');
  const [privacyFilter, setPrivacyFilter] = useState<PrivacyFilter>('ALL');

  const poolsQuery = trpc.listPools.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const categoriesQuery = trpc.listCategories.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const projectedBalancesQuery = trpc.getProjectedPoolBalances.useQuery(undefined, {
    enabled: !!session?.user && selectedHorizon > 0,
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
      projectedBalancesQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const getBankForPool = (bankAccountId?: string | null) =>
    bankAccounts.find((b) => b.id === bankAccountId);

  const getPoolBalance = (poolId: string, currentBalance: number) => {
    if (selectedHorizon > 0 && projectedBalancesQuery.data) {
      const cols = projectedBalancesQuery.data.columns;
      if (cols && cols.length > 0) {
        const colIndex = Math.min(selectedHorizon - 1, cols.length - 1);
        const col = cols[colIndex];
        if (col) {
          const bal = projectedBalancesQuery.data.poolBalances[poolId]?.[col.id];
          if (typeof bal === 'number') return bal;
        }
      }
    }
    return currentBalance;
  };

  // Filtered pools
  const filteredPools = useMemo(() => {
    return pools.filter((p) => {
      if (typeFilter !== 'ALL' && p.poolType !== typeFilter) return false;
      if (privacyFilter === 'SHARED' && p.isPrivate) return false;
      if (privacyFilter === 'PRIVATE' && !p.isPrivate) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchesPool = p.name.toLowerCase().includes(q);
      const bank = getBankForPool(p.bankAccountId);
      const matchesBank = bank?.name.toLowerCase().includes(q);
      const matchesCat = categories.some((c) => c.poolId === p.id && c.name.toLowerCase().includes(q));

      return matchesPool || matchesBank || matchesCat;
    });
  }, [pools, typeFilter, privacyFilter, searchQuery, bankAccounts, categories]);

  const everydayPools = filteredPools.filter((p) => p.poolType === 'EVERYDAY');
  const billsPools = filteredPools.filter((p) => p.poolType === 'REGULAR');
  const goalPools = filteredPools.filter((p) => p.poolType === 'GOAL');

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
        {/* Top Header Row with Add Pool, Move Money & Overflow Menu (3-dots) */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity
            onPress={() => setPoolModalVisible(true)}
            style={styles.addPoolBtn}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.addPoolText}>{t('categories.addPool')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMoveMoneyVisible(true)}
            style={styles.moveMoneyBtn}
          >
            <Feather name="repeat" size={14} color="#2563eb" />
            <Text style={styles.moveMoneyText}>{t('dashboard.moveMoney')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setOverflowMenuVisible(true)}
            style={styles.overflowBtn}
            accessibilityLabel={t('categories.moreOptions')}
          >
            <Feather name="more-horizontal" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <SearchInput
          placeholder={t('categories.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Filter Chips: Pool Types & Privacy */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(['ALL', 'EVERYDAY', 'REGULAR', 'GOAL'] as const).map((ft) => (
              <TouchableOpacity
                key={ft}
                onPress={() => setTypeFilter(ft)}
                style={[styles.filterChip, typeFilter === ft && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, typeFilter === ft && styles.filterChipTextActive]}>
                  {ft === 'ALL'
                    ? t('transactions.filterAll')
                    : ft === 'EVERYDAY'
                    ? t('categories.typeEveryday')
                    : ft === 'REGULAR'
                    ? t('categories.typeRegular')
                    : t('categories.typeGoal')}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.filterDivider} />

            {(['ALL', 'SHARED', 'PRIVATE'] as const).map((pt) => (
              <TouchableOpacity
                key={pt}
                onPress={() => setPrivacyFilter(pt)}
                style={[styles.filterChip, privacyFilter === pt && styles.filterChipNavyActive]}
              >
                <Text style={[styles.filterChipText, privacyFilter === pt && styles.filterChipTextActive]}>
                  {pt === 'ALL'
                    ? t('transactions.filterAll')
                    : pt === 'SHARED'
                    ? t('categories.householdBadge').replace(/[()]/g, '')
                    : t('categories.privateBadge').replace(/[()]/g, '')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 12-Month Timeline Scrubber */}
        <View style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Feather name="clock" size={14} color="#2563eb" />
            <Text style={styles.timelineTitle}>
              {selectedHorizon === 0
                ? t('categories.currentRealTimeBalances')
                : t('categories.projectedBalances', { months: selectedHorizon })}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrubberRow}
          >
            {HORIZON_MONTHS.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setSelectedHorizon(m)}
                style={[
                  styles.horizonChip,
                  selectedHorizon === m && styles.horizonChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.horizonText,
                    selectedHorizon === m && styles.horizonTextActive,
                  ]}
                >
                  {m === 0 ? t('common.today') : `+${m}M`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {poolsQuery.isLoading ? (
          <SkeletonCard count={3} />
        ) : (
          <View style={styles.sectionsContainer}>
            {/* Everyday Pool Group */}
            {everydayPools.length > 0 && (
              <View style={styles.poolGroup}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{t('categories.everydaySpending')}</Text>
                  <Text style={styles.groupCount}>{everydayPools.length}</Text>
                </View>

                {everydayPools.map((pool) => {
                  const bank = getBankForPool(pool.bankAccountId);
                  const bal = getPoolBalance(pool.id, pool.currentBalance);
                  const nestedCount = categories.filter((c) => c.poolId === pool.id).length;

                  return (
                    <TouchableOpacity
                      key={pool.id}
                      activeOpacity={0.8}
                      onPress={() => router.push(`/(app)/pools/${pool.id}` as never)}
                      style={styles.poolCard}
                    >
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.titleRow}>
                            <Text style={styles.poolName}>{pool.name}</Text>
                            {pool.isSurplusTarget && (
                              <View style={styles.surplusBadge}>
                                <Text style={styles.surplusBadgeText}>{t('categories.surplusBadgeText')}</Text>
                              </View>
                            )}
                          </View>
                          {bank && (
                            <View style={styles.bankBadgeWrap}>
                              <BankProviderBadge
                                provider={bank.bankProvider}
                                size="sm"
                              />
                              <Text style={styles.bankNameText}>{bank.name}</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.balCol}>
                          <Text style={styles.balNum}>{formatAUD(bal)}</Text>
                          <Text style={styles.balSub}>
                            {nestedCount > 0 ? t('categories.nestedCategories', { count: nestedCount }) : t('categories.mainPool')}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Regular Bills Group */}
            {billsPools.length > 0 && (
              <View style={styles.poolGroup}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{t('categories.regularBills')}</Text>
                  <Text style={styles.groupCount}>{billsPools.length}</Text>
                </View>

                {billsPools.map((pool) => {
                  const bank = getBankForPool(pool.bankAccountId);
                  const bal = getPoolBalance(pool.id, pool.currentBalance);
                  const nestedCount = categories.filter((c) => c.poolId === pool.id).length;

                  return (
                    <TouchableOpacity
                      key={pool.id}
                      activeOpacity={0.8}
                      onPress={() => router.push(`/(app)/pools/${pool.id}` as never)}
                      style={styles.poolCard}
                    >
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.poolName}>{pool.name}</Text>
                          {bank && (
                            <View style={styles.bankBadgeWrap}>
                              <BankProviderBadge
                                provider={bank.bankProvider}
                                size="sm"
                              />
                              <Text style={styles.bankNameText}>{bank.name}</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.balCol}>
                          <Text style={styles.balNum}>{formatAUD(bal)}</Text>
                          <Text style={styles.balSub}>
                            {nestedCount > 0 ? t('categories.nestedCategories', { count: nestedCount }) : t('categories.mainPool')}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Savings Goals Group */}
            {goalPools.length > 0 && (
              <View style={styles.poolGroup}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{t('categories.savingsGoals')}</Text>
                  <Text style={styles.groupCount}>{goalPools.length}</Text>
                </View>

                {goalPools.map((pool) => {
                  const bank = getBankForPool(pool.bankAccountId);
                  const bal = getPoolBalance(pool.id, pool.currentBalance);
                  const target = pool.targetAmount ? parseFloat(pool.targetAmount) : 0;
                  const pct = target > 0 ? Math.min(100, Math.round((bal / target) * 100)) : 0;

                  return (
                    <TouchableOpacity
                      key={pool.id}
                      activeOpacity={0.8}
                      onPress={() => router.push(`/(app)/pools/${pool.id}` as never)}
                      style={styles.poolCard}
                    >
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.poolName}>{pool.name}</Text>
                          {bank && (
                            <View style={styles.bankBadgeWrap}>
                              <BankProviderBadge
                                provider={bank.bankProvider}
                                size="sm"
                              />
                              <Text style={styles.bankNameText}>{bank.name}</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.balCol}>
                          <Text style={styles.balNum}>{formatAUD(bal)}</Text>
                          <Text style={styles.balSub}>
                            {target > 0 ? `${pct}% of ${formatAUD(target)}` : t('categories.noTarget')}
                          </Text>
                        </View>
                      </View>

                      {target > 0 && (
                        <View style={styles.progressTrack}>
                          <View
                            style={[styles.progressFill, { width: `${pct}%` }]}
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {filteredPools.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>
                  {poolsQuery.isError
                    ? t('errors.generic') || 'Unable to load pools. Pull down to retry.'
                    : pools.length === 0
                    ? t('categories.poolNotFound')
                    : t('categories.noCategoriesMatched')}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Overflow Menu Sheet (Recalibrate & View Archived Pools) */}
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
                router.push({ pathname: '/(setup)/income', params: { mode: 'rerun' } } as Href);
              }}
            >
              <Feather name="settings" size={16} color="#475569" />
              <Text style={styles.menuItemText}>{t('categories.recalibrateBudget')}</Text>
            </TouchableOpacity>

            <View style={styles.menuItemDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setOverflowMenuVisible(false);
                router.push('/(app)/archived' as never);
              }}
            >
              <Feather name="archive" size={16} color="#475569" />
              <Text style={styles.menuItemText}>{t('categories.viewArchivedPools')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Pool Modal */}
      <CategoryFormModal
        visible={poolModalVisible}
        onClose={() => setPoolModalVisible(false)}
        onSuccess={() => poolsQuery.refetch()}
      />

      {/* Move Money Modal (Re-using QuickExpenseModal with TRANSFER mode) */}
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
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addPoolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  addPoolText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  moveMoneyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  moveMoneyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  overflowBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
  },
  filterSection: {
    paddingVertical: 2,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipNavyActive: {
    backgroundColor: '#1B2B4B',
    borderColor: '#1B2B4B',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  scrubberRow: {
    gap: 8,
  },
  horizonChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  horizonChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  horizonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  horizonTextActive: {
    color: '#FFFFFF',
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
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
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
