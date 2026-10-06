import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  MobileScreenWrapper,
  SkeletonCard,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { ProjectionScrubber } from '../../../components/pools/projection/ProjectionScrubber';
import { ProjectionPoolGroupSection } from '../../../components/pools/projection/ProjectionPoolGroupSection';

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
            tintColor={DESIGN_TOKENS.colors.accent}
          />
        }
      >
        <View style={styles.noticeBanner}>
          <Feather name="lock" size={14} color={DESIGN_TOKENS.colors.accentDark} />
          <Text style={styles.noticeText}>
            {t('categories.projectionModeReadOnlyNotice')}
          </Text>
        </View>

        <ProjectionScrubber
          selectedHorizon={selectedHorizon}
          onSelectHorizon={setSelectedHorizon}
        />

        {poolsQuery.isLoading ? (
          <SkeletonCard count={3} />
        ) : (
          <View style={styles.sectionsContainer}>
            <ProjectionPoolGroupSection
              title={t('categories.everydayPoolsUpper')}
              pools={everydayPools}
              getBankForPool={getBankForPool}
              getPoolBalance={getPoolBalance}
              categories={categories}
            />

            <ProjectionPoolGroupSection
              title={t('categories.billsPoolsUpper')}
              pools={billsPools}
              getBankForPool={getBankForPool}
              getPoolBalance={getPoolBalance}
              categories={categories}
            />

            <ProjectionPoolGroupSection
              title={t('categories.goalsUpper')}
              pools={goalPools}
              getBankForPool={getBankForPool}
              getPoolBalance={getPoolBalance}
              categories={categories}
              isGoal
            />
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
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: 14,
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.accentDark,
  },
  sectionsContainer: {
    gap: 18,
  },
});
