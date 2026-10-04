import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../lib/format';
import { MarkPaidEvent } from '../MarkPaidModal';

interface UpcomingExpenseItem {
  id: string;
  name: string | null;
  expectedDate: string;
  expectedAmount: string;
  poolId?: string | null;
  categoryId?: string | null;
}

interface CategoryDetailUpcomingSectionProps {
  categoryId: string;
  upcomingExpenses: UpcomingExpenseItem[];
  topUpcomingExpenses: UpcomingExpenseItem[];
  upcomingExpanded: boolean;
  onToggleExpanded: () => void;
  onMarkPaid: (event: MarkPaidEvent) => void;
}

export function CategoryDetailUpcomingSection({
  categoryId,
  upcomingExpenses,
  topUpcomingExpenses,
  upcomingExpanded,
  onToggleExpanded,
  onMarkPaid,
}: CategoryDetailUpcomingSectionProps) {
  const router = useRouter();

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <TouchableOpacity
          onPress={onToggleExpanded}
          style={styles.accordionHeaderBtn}
          activeOpacity={0.7}
        >
          <Feather
            name={upcomingExpanded ? 'chevron-down' : 'chevron-right'}
            size={16}
            color={DESIGN_TOKENS.colors.primary}
          />
          <Text style={styles.sectionTitle}>
            {t('incomeBillsTabs.upcomingExpensesTitle')} ({upcomingExpenses.length})
          </Text>
        </TouchableOpacity>
        {upcomingExpenses.length > 5 && (
          <TouchableOpacity
            onPress={() =>
              router.push(
                `/(app)/paychecks?tab=EVENTS&type=EXPENSE&categoryId=${categoryId}&returnTo=${encodeURIComponent(`/(app)/categories/${categoryId}`)}` as never
              )
            }
            style={styles.viewHistoryBtn}
          >
            <Text style={styles.viewHistoryText}>
              {t('categories.seeAllUpcomingExpenses')}
            </Text>
            <Feather name="chevron-right" size={13} color={DESIGN_TOKENS.colors.sereneBlue} />
          </TouchableOpacity>
        )}
      </View>

      {upcomingExpanded && (
        <>
          {topUpcomingExpenses.length > 0 ? (
            <View style={styles.upcomingList}>
              {topUpcomingExpenses.map((exp) => (
                <View key={exp.id} style={styles.upcomingCard}>
                  <View style={styles.flex1}>
                    <Text style={styles.upcomingName}>{exp.name || t('common.description')}</Text>
                    <Text style={styles.upcomingDate}>
                      {formatDate(exp.expectedDate)}
                    </Text>
                  </View>

                  <View style={styles.upcomingRightCol}>
                    <Text style={styles.upcomingAmount}>
                      {formatAUD(exp.expectedAmount)}
                    </Text>
                    <TouchableOpacity
                      style={styles.payBtn}
                      onPress={() => {
                        onMarkPaid({
                          id: exp.id,
                          name: exp.name || 'Expense',
                          expectedAmount: parseFloat(exp.expectedAmount),
                          expectedDate: exp.expectedDate,
                          poolId: exp.poolId,
                          categoryId: exp.categoryId,
                        });
                      }}
                    >
                      <Feather name="check" size={12} color={DESIGN_TOKENS.colors.onPrimary} />
                      <Text style={styles.payBtnText}>{t('common.markSpent')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                {t('badges.noUpcomingBills')}
              </Text>
            </View>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
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
  upcomingList: {
    gap: 10,
  },
  upcomingCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upcomingName: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  upcomingDate: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    marginTop: 2,
  },
  upcomingRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  upcomingAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.critical,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  payBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.onPrimary,
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
