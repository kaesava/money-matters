import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { MobileScreenWrapper, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { EnvelopeFormModal } from '../../../components/EnvelopeFormModal';
import { QuickExpenseModal, QuickActionInitialData } from '../../../components/QuickExpenseModal';
import { MarkPaidModal, MarkPaidEvent } from '../../../components/MarkPaidModal';
import { PoolSummaryCard } from '../../../components/envelopes/PoolSummaryCard';
import { PoolUpcomingSection } from '../../../components/envelopes/PoolUpcomingSection';
import { PoolHistorySection } from '../../../components/envelopes/PoolHistorySection';
import { useAppFeatures } from '../../../context/useAppFeatures';
import { NotesFeedModal } from '@money-matters/capability-file-notes/mobile';

export default function PoolDetailScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [poolModalVisible, setPoolModalVisible] = useState(false);
  const [quickExpenseVisible, setQuickExpenseVisible] = useState(false);
  const [quickExpenseData, setQuickExpenseData] = useState<QuickActionInitialData | undefined>(undefined);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const { hasFileNotes } = useAppFeatures();

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: !!session?.user });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: !!session?.user });
  const txLedgerQuery = trpc.listTransactions.useQuery({ envelopeId: id, limit: 10 }, { enabled: !!session?.user && !!id });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, { enabled: !!session?.user && !!id });

  const pool = poolsQuery.data?.find((p) => p.id === id);
  const bankAccount = bankAccountsQuery.data?.find((b) => b.id === pool?.bankAccountId);

  const upcomingExpenses = useMemo(() => {
    return (expenseEventsQuery.data ?? [])
      .filter((e) => e.status !== 'CONFIRMED' && e.envelopeId === id)
      .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));
  }, [expenseEventsQuery.data, id]);

  if (poolsQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.accent} />
      </View>
    );
  }

  const handleBack = () => {
    if (returnTo) router.push(returnTo as Href);
    else router.back();
  };

  if (!pool) {
    return (
      <MobileScreenWrapper title={t('categories.poolNotFound')} showBack onBackPress={handleBack}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>{t('categories.poolNotFound')}</Text>
        </View>
      </MobileScreenWrapper>
    );
  }

  return (
    <MobileScreenWrapper title={pool.name} user={session?.user} showBack onBackPress={handleBack}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <PoolSummaryCard
          pool={pool}
          bankAccountName={bankAccount?.name}
          onEdit={() => setPoolModalVisible(true)}
          onOpenNotes={hasFileNotes ? () => setNotesModalVisible(true) : undefined}
          onDrawDown={
            pool.envelopeType === 'EVERYDAY'
              ? undefined
              : () => {
                  setQuickExpenseData({ type: 'DEBIT', name: 'Draw down', categoryId: pool.id });
                  setQuickExpenseVisible(true);
                }
          }
        />

        <PoolUpcomingSection
          poolId={pool.id}
          upcomingExpenses={upcomingExpenses}
          expanded={upcomingExpanded}
          onToggleExpand={() => setUpcomingExpanded((v) => !v)}
          onMarkPaid={(evt) =>
            setMarkPaidEvent({
              ...evt,
              expectedDate:
                evt.expectedDate instanceof Date
                  ? evt.expectedDate.toISOString()
                  : String(evt.expectedDate),
            })
          }
        />

        <PoolHistorySection
          poolId={pool.id}
          transactions={txLedgerQuery.data ?? []}
          expanded={historyExpanded}
          onToggleExpand={() => setHistoryExpanded((v) => !v)}
        />
      </ScrollView>

      <QuickExpenseModal
        visible={quickExpenseVisible}
        initialType="DEBIT"
        initialData={quickExpenseData}
        onClose={() => {
          setQuickExpenseVisible(false);
          setQuickExpenseData(undefined);
        }}
        onSuccess={() => {
          poolsQuery.refetch();
          txLedgerQuery.refetch();
        }}
      />

      <EnvelopeFormModal
        visible={poolModalVisible}
        categoryToEdit={{
          id: pool.id,
          name: pool.name,
          type: pool.envelopeType === 'EVERYDAY'
            ? 'EVERYDAY'
            : pool.envelopeType === 'SCHEDULED_BILL' || pool.envelopeType === 'FLEXIBLE_BILL'
            ? 'REGULAR'
            : 'GOAL',
          envelopeType: pool.envelopeType,
          poolType: pool.envelopeType,
          targetAmount: pool.targetAmount,
          enteredAmount: pool.enteredAmount,
          monthlyAmount: pool.monthlyAmount,
          budgetFrequency: pool.budgetFrequency as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY' | null,
          startDate: pool.startDate,
          rrule: pool.rrule,
          goalMode: pool.goalMode,
          endDate: pool.endDate,
          bankAccountId: pool.bankAccountId,
          safetyBufferFloor: pool.safetyBufferFloor,
          isSurplusTarget: pool.isSurplusTarget,
          hasScheduledEvents: pool.hasScheduledEvents,
        }}
        onClose={() => setPoolModalVisible(false)}
        onSuccess={() => {
          poolsQuery.refetch();
          expenseEventsQuery.refetch();
        }}
      />

      <MarkPaidModal
        visible={!!markPaidEvent}
        event={markPaidEvent}
        onClose={() => setMarkPaidEvent(null)}
        onSuccess={() => {
          expenseEventsQuery.refetch();
          poolsQuery.refetch();
          txLedgerQuery.refetch();
        }}
      />

      {hasFileNotes && (
        <NotesFeedModal
          visible={notesModalVisible}
          entityType="ENVELOPE"
          entityId={pool.id}
          entityName={pool.name}
          onClose={() => setNotesModalVisible(false)}
        />
      )}
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundContainer: { padding: 30, alignItems: 'center' },
  notFoundText: { fontSize: 14, color: DESIGN_TOKENS.colors.textMuted },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 60 },
});
