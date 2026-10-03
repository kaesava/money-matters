import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  MobileScreenWrapper,
  BankProviderBadge,
  SkeletonCard,
  CardDrawerIndicator,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { formatAUD } from '../../../lib/format';

const HORIZON_STEPS = [0, 1, 2, 3, 6, 9, 12];

export default function PoolProjectionScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [selectedHorizon, setSelectedHorizon] = useState<number>(1);
  const [refreshing, setRefreshing] = useState(false);

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

  const everydayPools = pools.filter((p) => p.poolType === 'EVERYDAY');
  const billsPools = pools.filter((p) => p.poolType === 'REGULAR');
  const goalPools = pools.filter((p) => p.poolType === 'GOAL');

  return (
    <MobileScreenWrapper
      title={t('categories.projectionModeTitle')}
      showBack
      onBackPress={() => router.back()}
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
        {/* Read-only notice */}
        <View style={styles.noticeBanner}>
          <Feather name="lock" size={14} color="#1D4ED8" />
          <Text style={styles.noticeText}>
            {t('categories.projectionModeReadOnlyNotice')}
          </Text>
        </View>

        {/* Projection Horizon Scrubber */}
        <View style={styles.scrubberCard}>
          <View style={styles.scrubberHeader}>
            <View style={styles.scrubberLabelWrap}>
              <Feather name="trending-up" size={14} color="#2563eb" />
              <Text style={styles.scrubberTitle}>
                {t('categories.projectionSliderLabel')}
              </Text>
            </View>
            <View style={styles.horizonBadge}>
              <Text style={styles.horizonBadgeText}>
                {selectedHorizon === 0
                  ? t('common.today')
                  : t('categories.projectedBalances', { months: selectedHorizon })}
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizonList}
          >
            {HORIZON_STEPS.map((m) => (
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
                    styles.horizonChipText,
                    selectedHorizon === m && styles.horizonChipTextActive,
                  ]}
                >
                  {m === 0 ? t('common.today') : `+${m}M`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Pool Balances Breakdown */}
        {poolsQuery.isLoading ? (
          <SkeletonCard count={3} />
        ) : (
          <View style={styles.sectionsContainer}>
            {/* Everyday Pools */}
            {everydayPools.length > 0 && (
              <View style={styles.poolGroup}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>
                    {t('categories.everydayPoolsUpper')}
                  </Text>
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

                        <View style={styles.balWrap}>
                          <View style={styles.balCol}>
                            <Text style={styles.balNum}>{formatAUD(bal)}</Text>
                            <Text style={styles.balSub}>
                              {nestedCount > 0
                                ? t('categories.nestedCategories', { count: nestedCount })
                                : t('categories.mainPool')}
                            </Text>
                          </View>
                          <CardDrawerIndicator size={18} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Bills Pools */}
            {billsPools.length > 0 && (
              <View style={styles.poolGroup}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>
                    {t('categories.billsPoolsUpper')}
                  </Text>
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

                        <View style={styles.balWrap}>
                          <View style={styles.balCol}>
                            <Text style={styles.balNum}>{formatAUD(bal)}</Text>
                            <Text style={styles.balSub}>
                              {nestedCount > 0
                                ? t('categories.nestedCategories', { count: nestedCount })
                                : t('categories.mainPool')}
                            </Text>
                          </View>
                          <CardDrawerIndicator size={18} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Goals */}
            {goalPools.length > 0 && (
              <View style={styles.poolGroup}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>
                    {t('categories.goalsUpper')}
                  </Text>
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

                        <View style={styles.balWrap}>
                          <View style={styles.balCol}>
                            <Text style={styles.balNum}>{formatAUD(bal)}</Text>
                            <Text style={styles.balSub}>
                              {target > 0
                                ? `${pct}% of ${formatAUD(target)}`
                                : t('categories.noTarget')}
                            </Text>
                          </View>
                          <CardDrawerIndicator size={18} />
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
          </View>
        )}
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  scrubberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  scrubberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scrubberLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scrubberTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  horizonBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  horizonBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  horizonList: {
    flexDirection: 'row',
    gap: 8,
  },
  horizonChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  horizonChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  horizonChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  horizonChipTextActive: {
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
  poolName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
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
});
