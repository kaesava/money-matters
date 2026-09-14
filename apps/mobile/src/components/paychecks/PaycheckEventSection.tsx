import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD, formatDate } from '../../lib/format';

export interface PaycheckIncomeEvent {
  id: string;
  name?: string | null;
  expectedAmount: string;
  expectedDate: string;
}

export interface PaycheckExpenseEvent {
  id: string;
  name?: string | null;
  expectedAmount: string;
  expectedDate: string;
  categoryId?: string | null;
}

export interface PaycheckEventSectionProps {
  incomeEvents: PaycheckIncomeEvent[];
  expenseEvents: PaycheckExpenseEvent[];
  onOpenPaydayWizard: (eventId: string) => void;
  onEditUpcomingIncome?: (event: PaycheckIncomeEvent) => void;
  onDeleteUpcomingIncome?: (event: PaycheckIncomeEvent) => void;
  onEditUpcomingExpense: (event: PaycheckExpenseEvent) => void;
  onDeleteUpcomingExpense?: (event: PaycheckExpenseEvent) => void;
  onMarkExpensePaid: (eventId: string, amount: string) => void;
}

export const PaycheckEventSection: React.FC<PaycheckEventSectionProps> = ({
  incomeEvents,
  expenseEvents,
  onOpenPaydayWizard,
  onEditUpcomingIncome,
  onDeleteUpcomingIncome,
  onEditUpcomingExpense,
  onDeleteUpcomingExpense,
  onMarkExpensePaid,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>{t('badges.upcomingPaydays')}</Text>
      {incomeEvents.length === 0 ? (
        <Text style={styles.emptyText}>{t('badges.noUpcomingPaydays')}</Text>
      ) : (
        incomeEvents.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name || t('badges.income')}</Text>
              <Text style={styles.cardAmount}>{formatAUD(item.expectedAmount)}</Text>
            </View>
            <Text style={styles.cardDate}>
              {t('common.dueOn', { date: formatDate(item.expectedDate) })}
            </Text>
            <View style={styles.actionRow}>
              {onDeleteUpcomingIncome && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => onDeleteUpcomingIncome(item)}
                >
                  <Feather name="trash-2" size={12} color="#ba1a1a" />
                  <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
                </TouchableOpacity>
              )}
              {onEditUpcomingIncome && (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => onEditUpcomingIncome(item)}
                >
                  <Feather name="edit-2" size={12} color={DESIGN_TOKENS.colors.primary} />
                  <Text style={styles.editBtnText}>{t('common.edit')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.processBtn}
                onPress={() => onOpenPaydayWizard(item.id)}
              >
                <Feather name="play" size={12} color="#FFF" />
                <Text style={styles.processBtnText}>{t('modals.paydayPreview.runWaterfall')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>{t('badges.upcomingBills')}</Text>
      {expenseEvents.length === 0 ? (
        <Text style={styles.emptyText}>{t('badges.noUpcomingBills')}</Text>
      ) : (
        expenseEvents.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name || t('badges.bill')}</Text>
              <Text style={styles.cardAmount}>{formatAUD(item.expectedAmount)}</Text>
            </View>
            <Text style={styles.cardDate}>
              {t('common.dueOn', { date: formatDate(item.expectedDate) })}
            </Text>
            <View style={styles.actionRow}>
              {onDeleteUpcomingExpense && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => onDeleteUpcomingExpense(item)}
                >
                  <Feather name="trash-2" size={12} color="#ba1a1a" />
                  <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => onEditUpcomingExpense(item)}
              >
                <Feather name="edit-2" size={12} color={DESIGN_TOKENS.colors.primary} />
                <Text style={styles.editBtnText}>{t('common.edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => onMarkExpensePaid(item.id, item.expectedAmount)}
              >
                <Feather name="check" size={12} color="#FFF" />
                <Text style={styles.payBtnText}>{t('modals.upcomingExpense.markPaid')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  cardDate: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    marginBottom: 10,
  },
  processBtn: {
    backgroundColor: DESIGN_TOKENS.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  processBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: {
    color: DESIGN_TOKENS.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteBtnText: {
    color: '#ba1a1a',
    fontSize: 12,
    fontWeight: '700',
  },
  payBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  payBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
