import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { TransactionRow } from '../../components/TransactionRow';
import { formatRelativeDate } from '../../lib/format';

export default function TransactionsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: transactions = [], isLoading } = trpc.listTransactions.useQuery({ limit: 50, offset: 0 });

  // Group transactions by relative date key
  const grouped = transactions.reduce<Record<string, typeof transactions>>((acc, tx) => {
    const key = formatRelativeDate(tx.recordedAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  const sections = Object.keys(grouped).map(key => ({
    title: key,
    data: grouped[key],
  }));

  return (
    <MobileScreenWrapper
      title={t('transactions.title', { defaultValue: 'Transactions' })}
      user={session?.user}
      onNavigateHome={() => router.push('/(app)/home')}
      onNavigateBuckets={() => router.push('/(app)/categories')}
      onNavigateSettings={() => router.push('/(app)/settings')}
    >
      {isLoading ? (
        <ActivityIndicator color={DESIGN_TOKENS.colors.accent} style={{ marginTop: 40 }} />
      ) : transactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💸</Text>
          <Text style={styles.emptyTitle}>{t('transactions.empty', { defaultValue: 'No transactions yet' })}</Text>
          <Text style={styles.emptySubtitle}>
            {t('transactions.emptySubtitle', { defaultValue: 'Tap + to log your first expense' })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>{item.title}</Text>
              {item.data.map(tx => (
                <TransactionRow
                  key={tx.id}
                  amount={tx.amount}
                  flowType={tx.flowType}
                  categoryName={tx.categoryName || 'Unknown'}
                  note={tx.note}
                  recordedAt={tx.recordedAt}
                />
              ))}
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </MobileScreenWrapper>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  list: { paddingBottom: 100 },
  section: { marginBottom: 20 },
  sectionHeader: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, color: D.colors.textMuted, textTransform: 'uppercase', marginBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: D.colors.textPrimary, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: D.colors.textMuted, textAlign: 'center' },
});
