import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD, formatDate } from '../../lib/format';
import { useRouter } from 'expo-router';

interface PoolUpcomingSectionProps {
  poolId: string;
  upcomingExpenses: any[];
  expanded: boolean;
  onToggleExpand: () => void;
  onMarkPaid: (event: any) => void;
}

export function PoolUpcomingSection({
  poolId,
  upcomingExpenses,
  expanded,
  onToggleExpand,
  onMarkPaid,
}: PoolUpcomingSectionProps) {
  const router = useRouter();
  const topUpcoming = upcomingExpenses.slice(0, 5);

  return (
    <>
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <TouchableOpacity onPress={onToggleExpand} style={styles.accordionHeaderBtn} activeOpacity={0.7}>
          <Feather name={expanded ? 'chevron-down' : 'chevron-right'} size={16} color="#1B2B4B" />
          <Text style={styles.sectionTitle}>
            {t('incomeBillsTabs.upcomingExpensesTitle')} ({upcomingExpenses.length})
          </Text>
        </TouchableOpacity>
        {upcomingExpenses.length > 5 && (
          <TouchableOpacity
            onPress={() =>
              router.push(
                `/(app)/paychecks?tab=EVENTS&type=EXPENSE&poolId=${poolId}&returnTo=${encodeURIComponent(`/(app)/pools/${poolId}`)}` as never
              )
            }
            style={styles.viewHistoryBtn}
          >
            <Text style={styles.viewHistoryText}>{t('categories.seeAllUpcomingExpenses')}</Text>
            <Feather name="chevron-right" size={13} color={DESIGN_TOKENS.colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      {expanded && (
        <>
          {topUpcoming.length > 0 ? (
            <View style={styles.upcomingList}>
              {topUpcoming.map((exp) => (
                <View key={exp.id} style={styles.upcomingCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.upcomingName}>{exp.name || t('common.description')}</Text>
                    <Text style={styles.upcomingDate}>{formatDate(exp.expectedDate)}</Text>
                  </View>

                  <View style={styles.upcomingRightCol}>
                    <Text style={styles.upcomingAmount}>{formatAUD(exp.expectedAmount)}</Text>
                    <TouchableOpacity
                      style={styles.payBtn}
                      onPress={() =>
                        onMarkPaid({
                          id: exp.id,
                          name: exp.name || 'Expense',
                          expectedAmount: parseFloat(exp.expectedAmount),
                          expectedDate: exp.expectedDate,
                          poolId: exp.poolId,
                          categoryId: exp.categoryId,
                        })
                      }
                    >
                      <Feather name="check" size={12} color="#FFFFFF" />
                      <Text style={styles.payBtnText}>{t('common.markSpent')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{t('badges.noUpcomingBills')}</Text>
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
  upcomingList: { gap: 10, marginTop: 10 },
  upcomingCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upcomingName: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.primary },
  upcomingDate: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted, marginTop: 2 },
  upcomingRightCol: { alignItems: 'flex-end', gap: 6 },
  upcomingAmount: { fontSize: 14, fontWeight: '800', fontFamily: 'monospace', color: DESIGN_TOKENS.colors.critical },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  payBtnText: { fontSize: 11, fontWeight: '700', color: DESIGN_TOKENS.colors.onAccent },
  emptyBox: { backgroundColor: DESIGN_TOKENS.colors.surfaceVariant, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, alignItems: 'center', marginTop: 10 },
  emptyText: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, textAlign: 'center' },
});
