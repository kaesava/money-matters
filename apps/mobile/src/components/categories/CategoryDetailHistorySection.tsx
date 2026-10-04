import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { TransactionRow } from '../TransactionRow';

interface TransactionItem {
  id: string;
  amount: string;
  flowType: string;
  poolName?: string | null;
  categoryName?: string | null;
  note?: string | null;
  recordedAt: string;
}

interface CategoryDetailHistorySectionProps {
  categoryId: string;
  recentTransactions: TransactionItem[];
  historyExpanded: boolean;
  onToggleExpanded: () => void;
}

export function CategoryDetailHistorySection({
  categoryId,
  recentTransactions,
  historyExpanded,
  onToggleExpanded,
}: CategoryDetailHistorySectionProps) {
  const router = useRouter();

  return (
    <>
      <View style={[styles.sectionHeaderRow, styles.marginTop24]}>
        <TouchableOpacity
          onPress={onToggleExpanded}
          style={styles.accordionHeaderBtn}
          activeOpacity={0.7}
        >
          <Feather
            name={historyExpanded ? 'chevron-down' : 'chevron-right'}
            size={16}
            color={DESIGN_TOKENS.colors.primary}
          />
          <Text style={styles.sectionTitle}>
            {t('categories.recentHistory')} ({recentTransactions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            router.push(
              `/(app)/transactions?categoryId=${categoryId}&returnTo=${encodeURIComponent(`/(app)/categories/${categoryId}`)}` as never
            )
          }
          style={styles.viewHistoryBtn}
        >
          <Text style={styles.viewHistoryText}>
            {t('categories.seeAllHistory')}
          </Text>
          <Feather name="chevron-right" size={13} color={DESIGN_TOKENS.colors.sereneBlue} />
        </TouchableOpacity>
      </View>

      {historyExpanded && (
        <>
          {recentTransactions.length > 0 ? (
            <View style={styles.recentTxList}>
              {recentTransactions.map((tx) => (
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
              <Text style={styles.emptyText}>
                {t('categories.noRecentActivity')}
              </Text>
            </View>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  marginTop24: {
    marginTop: 24,
  },
  accordionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  viewHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewHistoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  recentTxList: {
    gap: 8,
  },
  emptyBox: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[500],
    textAlign: 'center',
  },
});
