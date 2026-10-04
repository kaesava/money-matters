import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { TransactionRow } from '../TransactionRow';
import { useRouter } from 'expo-router';

interface PoolHistorySectionProps {
  poolId: string;
  transactions: any[];
  expanded: boolean;
  onToggleExpand: () => void;
}

export function PoolHistorySection({
  poolId,
  transactions,
  expanded,
  onToggleExpand,
}: PoolHistorySectionProps) {
  const router = useRouter();

  return (
    <>
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <TouchableOpacity onPress={onToggleExpand} style={styles.accordionHeaderBtn} activeOpacity={0.7}>
          <Feather name={expanded ? 'chevron-down' : 'chevron-right'} size={16} color="#1B2B4B" />
          <Text style={styles.sectionTitle}>
            {t('categories.recentHistory')} ({transactions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            router.push(
              `/(app)/transactions?poolId=${poolId}&returnTo=${encodeURIComponent(`/(app)/pools/${poolId}`)}` as never
            )
          }
          style={styles.viewHistoryBtn}
        >
          <Text style={styles.viewHistoryText}>{t('categories.seeAllHistory')}</Text>
          <Feather name="chevron-right" size={13} color={DESIGN_TOKENS.colors.accent} />
        </TouchableOpacity>
      </View>

      {expanded && (
        <>
          {transactions.length > 0 ? (
            <View style={styles.recentTxList}>
              {transactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  amount={tx.amount}
                  flowType={tx.flowType as 'DEBIT' | 'CREDIT' | 'TRANSFER'}
                  poolName={tx.poolName}
                  categoryName={tx.categoryName}
                  note={tx.note}
                  recordedAt={tx.recordedAt}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{t('categories.noRecentActivity')}</Text>
            </View>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: DESIGN_TOKENS.colors.primary },
  viewHistoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewHistoryText: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
  recentTxList: { gap: 8, marginTop: 10 },
  emptyBox: { backgroundColor: DESIGN_TOKENS.colors.surfaceVariant, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, alignItems: 'center', marginTop: 10 },
  emptyText: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, textAlign: 'center' },
});
