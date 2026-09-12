import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  MobileScreenWrapper,
  BankProviderBadge,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { formatAUD } from '../../lib/format';
import { CategoryFormModal } from '../../components/CategoryFormModal';
import { MoveMoneyModal } from '../../components/MoveMoneyModal';

const HORIZON_MONTHS = [0, 1, 2, 3, 6, 12];

export default function PoolsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const [selectedHorizon, setSelectedHorizon] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [poolModalVisible, setPoolModalVisible] = useState(false);
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);

  const poolsQuery = trpc.listPools.useQuery();
  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();
  const projectedBalancesQuery = trpc.getProjectedPoolBalances.useQuery(undefined, {
    enabled: selectedHorizon > 0,
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
      title={t('nav.myMoney') || 'Pools'}
      user={session?.user}
      onNavigateHome={() => router.push('/(app)/home')}
      onNavigateCategories={() => router.push('/(app)/categories')}
      onNavigateSettings={() => router.push('/(app)/settings')}
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
        {/* Top Header Row with Add Pool & Move Money */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity
            onPress={() => setMoveMoneyVisible(true)}
            style={styles.moveMoneyBtn}
          >
            <Feather name="repeat" size={14} color="#2563eb" />
            <Text style={styles.moveMoneyText}>Move Money</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPoolModalVisible(true)}
            style={styles.addPoolBtn}
          >
            <Feather name="plus" size={14} color="#FFFFFF" />
            <Text style={styles.addPoolText}>Add Pool</Text>
          </TouchableOpacity>
        </View>

        {/* 12-Month Timeline Scrubber */}
        <View style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Feather name="clock" size={14} color="#2563eb" />
            <Text style={styles.timelineTitle}>
              {selectedHorizon === 0
                ? 'Current Real-Time Balances'
                : `Projected Balances (+${selectedHorizon} Months)`}
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
                  {m === 0 ? 'Today' : `+${m}M`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {poolsQuery.isLoading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 30 }} />
        ) : (
          <View style={styles.sectionsContainer}>
            {/* Everyday Pool Group */}
            <View style={styles.poolGroup}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>☕ Everyday Spending</Text>
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
                              <Text style={styles.surplusBadgeText}>Surplus</Text>
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
                          {nestedCount > 0 ? `${nestedCount} categories` : 'Main pool'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Regular Bills Group */}
            <View style={styles.poolGroup}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>📅 Regular Bills & Commitments</Text>
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
                          {nestedCount > 0 ? `${nestedCount} categories` : 'Main pool'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Savings Goals Group */}
            <View style={styles.poolGroup}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>🎯 Savings Goals</Text>
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
                          {target > 0 ? `${pct}% of ${formatAUD(target)}` : 'No target'}
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
          </View>
        )}
      </ScrollView>

      {/* Add Pool Modal */}
      <CategoryFormModal
        visible={poolModalVisible}
        onClose={() => setPoolModalVisible(false)}
        onSuccess={() => poolsQuery.refetch()}
      />

      {/* Move Money Modal */}
      <MoveMoneyModal
        visible={moveMoneyVisible}
        onClose={() => setMoveMoneyVisible(false)}
        onSuccess={() => poolsQuery.refetch()}
      />
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 90,
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
  },
  moveMoneyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
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
  },
  addPoolText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
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
});
