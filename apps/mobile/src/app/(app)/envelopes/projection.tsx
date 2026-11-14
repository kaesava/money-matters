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
import { ProjectionScrubber } from '../../../components/envelopes/projection/ProjectionScrubber';
import { ProjectionEnvelopeGroupSection } from '../../../components/envelopes/projection/ProjectionEnvelopeGroupSection';

export default function PoolProjectionScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [selectedHorizon, setSelectedHorizon] = useState<number>(1);
  const [refreshing, setRefreshing] = useState(false);

  const poolsQuery = trpc.listEnvelopes.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const projectedBalancesQuery = trpc.getProjectedPoolBalances.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const pools = poolsQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      poolsQuery.refetch(),
      bankAccountsQuery.refetch(),
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
        const sortedCols = [...cols].sort((a, b) => a.date.localeCompare(b.date));
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + Math.round(selectedHorizon * 30.4375));
        const targetDateISO = targetDate.toISOString().slice(0, 10);

        let matchingCol = sortedCols[0];
        for (const col of sortedCols) {
          if (col.date <= targetDateISO) {
            matchingCol = col;
          } else {
            break;
          }
        }

        if (matchingCol) {
          const pb = (projectedBalancesQuery.data as unknown as { envelopeBalances?: Record<string, Record<string, number>>; poolBalances?: Record<string, Record<string, number>> });
          const bal = (pb.envelopeBalances || pb.poolBalances)?.[poolId]?.[matchingCol.id];
          if (typeof bal === 'number') return bal;
        }
      }
    }
    return currentBalance;
  };

  const everydayPools = pools.filter((p) => p.envelopeType === 'EVERYDAY');
  const billsPools = pools.filter((p) => p.envelopeType === 'BILL');
  const goalPools = pools.filter((p) => p.envelopeType === 'GOAL');

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
            <ProjectionEnvelopeGroupSection
              title={t('categories.everydayPoolsUpper')}
              pools={everydayPools}
              getBankForPool={getBankForPool}
              getPoolBalance={getPoolBalance}
            />

            <ProjectionEnvelopeGroupSection
              title={t('categories.billsPoolsUpper')}
              pools={billsPools}
              getBankForPool={getBankForPool}
              getPoolBalance={getPoolBalance}
            />

            <ProjectionEnvelopeGroupSection
              title={t('categories.goalsUpper')}
              pools={goalPools}
              getBankForPool={getBankForPool}
              getPoolBalance={getPoolBalance}
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
