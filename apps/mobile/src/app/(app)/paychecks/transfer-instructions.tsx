import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui/mobile';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { MobileBankTransferRollupCard } from '../../../components/paychecks/MobileBankTransferRollupCard';

export default function TransferInstructionsScreen() {
  const { incomeEventId } = useLocalSearchParams<{ incomeEventId: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: !!session?.user });
  const pools = poolsQuery.data ?? [];

  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: !!session?.user });
  const bankAccounts = bankAccountsQuery.data ?? [];

  const planQuery = trpc.listAllocationPlan.useQuery(
    { incomeEventId: incomeEventId! },
    { enabled: !!incomeEventId && !!session?.user }
  );

  const previewQuery = trpc.previewPayday.useQuery(
    { incomeEventId: incomeEventId! },
    { enabled: !!incomeEventId && !!session?.user }
  );

  const isLoading = poolsQuery.isLoading || bankAccountsQuery.isLoading || planQuery.isLoading || previewQuery.isLoading;

  const linesMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (planQuery.data?.lines) {
      planQuery.data.lines.forEach((l) => {
        const amt = l.confirmedAmount || l.proposedAmount || '0.00';
        map[l.poolId] = parseFloat(amt).toFixed(2);
      });
    }
    return map;
  }, [planQuery.data]);

  const sweepPool = useMemo(() => {
    return (
      pools.find((p) => p.isSurplusTarget) ||
      pools.find((p) => p.poolType === 'EVERYDAY') ||
      pools[0]
    );
  }, [pools]);

  const receivingAccountId = previewQuery.data?.incomeEvent?.receivingAccountId;
  const sweepPoolRemainder = parseFloat(linesMap[sweepPool?.id || ''] || '0');

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={DESIGN_TOKENS.colors.accent} size="large" />
      </View>
    );
  }

  return (
    <MobileScreenWrapper
      title={t('cards.paydayTransfer.badge')}
      user={session?.user}
      showBack={true}
      onBackPress={() => router.replace('/(app)/paychecks' as never)}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerCard}>
          <Text style={styles.celebrationText}>🎉</Text>
          <Text style={styles.successHeading}>{t('paychecks.transfer.allDone')}</Text>
          <Text style={styles.successSubtext}>
            {t('paydayDrawer.confirmSuccess')}
          </Text>
        </View>

        <MobileBankTransferRollupCard
          receivingAccountId={receivingAccountId}
          pools={pools}
          linesMap={linesMap}
          sweepPoolId={sweepPool?.id}
          sweepPoolRemainder={sweepPoolRemainder}
          bankAccounts={bankAccounts}
        />

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.replace('/(app)/home' as never)}
        >
          <Text style={styles.doneBtnText}>{t('common.done')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 60, gap: 16 },
  headerCard: { alignItems: 'center', padding: 20 },
  celebrationText: { fontSize: 44, marginBottom: 8 },
  successHeading: { fontSize: 20, fontWeight: '800', color: D.colors.primary, textAlign: 'center' },
  successSubtext: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 },
  doneBtn: {
    backgroundColor: D.colors.accent,
    paddingVertical: 14,
    borderRadius: D.radius.md,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
